package middleware

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	entraAuthority = "https://login.microsoftonline.com/"
	jwksTTL        = time.Hour
	// 知らない kid が来ても、JWKS を取りに行くのはこの間隔に1回まで（でたらめな kid で外へ問い合わせ続けないため）
	jwksMinRefetch = 5 * time.Minute
	jwksMaxBytes   = 1 << 20
	clockLeeway    = time.Minute
)

// ErrInvalidToken はトークンが検証に通らなかった（署名・iss・aud・tid・期限など）
var ErrInvalidToken = errors.New("invalid token")

type entraClaims struct {
	jwt.RegisteredClaims
	Tid               string `json:"tid"`
	PreferredUsername string `json:"preferred_username"`
}

// EntraVerifier は Entra ID の ID トークンを検証する。
// 署名（RS256 だけ）・iss（テナント固定）・aud（クライアント ID）・tid・exp/nbf を確かめる。
type EntraVerifier struct {
	tenantID string
	clientID string
	keyfunc  jwt.Keyfunc
	parser   *jwt.Parser
}

// NewEntraVerifier は検証器を作る。tenantID か clientID が空なら nil を返す（呼ぶ側は Bearer をすべて拒否する）。
func NewEntraVerifier(tenantID, clientID string, keyfunc jwt.Keyfunc) *EntraVerifier {
	if tenantID == "" || clientID == "" || keyfunc == nil {
		return nil
	}
	return &EntraVerifier{
		tenantID: tenantID,
		clientID: clientID,
		keyfunc:  keyfunc,
		parser: jwt.NewParser(
			jwt.WithValidMethods([]string{"RS256"}),
			jwt.WithIssuer(entraAuthority+tenantID+"/v2.0"),
			jwt.WithAudience(clientID),
			jwt.WithExpirationRequired(),
			jwt.WithLeeway(clockLeeway),
		),
	}
}

// Verify はトークンを検証し、UPN（preferred_username を小文字にしたもの）を返す。
// 失敗の理由は ErrInvalidToken にまとめる（トークンの中身は返さない・ログに出さない）。
func (v *EntraVerifier) Verify(_ context.Context, raw string) (string, error) {
	var claims entraClaims
	tok, err := v.parser.ParseWithClaims(raw, &claims, v.keyfunc)
	if err != nil || !tok.Valid {
		return "", ErrInvalidToken
	}
	if claims.Tid != v.tenantID {
		return "", ErrInvalidToken
	}
	upn := strings.ToLower(strings.TrimSpace(claims.PreferredUsername))
	if upn == "" {
		return "", ErrInvalidToken
	}
	return upn, nil
}

// JWKSKeyfunc は Entra の公開鍵（JWKS）を取得してキャッシュする。
type JWKSKeyfunc struct {
	url    string
	client *http.Client
	now    func() time.Time

	mu        sync.Mutex
	keys      map[string]*rsa.PublicKey
	fetchedAt time.Time
}

// NewJWKSKeyfunc は、テナントの JWKS を使う Keyfunc を返す。
func NewJWKSKeyfunc(tenantID string) *JWKSKeyfunc {
	return newJWKSKeyfunc(entraAuthority+tenantID+"/discovery/v2.0/keys", &http.Client{Timeout: 5 * time.Second}, time.Now)
}

func newJWKSKeyfunc(url string, client *http.Client, now func() time.Time) *JWKSKeyfunc {
	return &JWKSKeyfunc{url: url, client: client, now: now}
}

// Keyfunc は jwt.Keyfunc として使う
func (j *JWKSKeyfunc) Keyfunc(t *jwt.Token) (any, error) {
	kid, _ := t.Header["kid"].(string)
	if kid == "" {
		return nil, errors.New("no kid")
	}
	return j.key(kid)
}

func (j *JWKSKeyfunc) key(kid string) (*rsa.PublicKey, error) {
	j.mu.Lock()
	defer j.mu.Unlock()

	now := j.now()
	fresh := j.keys != nil && now.Sub(j.fetchedAt) < jwksTTL
	if k, ok := j.keys[kid]; ok && fresh {
		return k, nil
	}
	// 期限切れ、または知らない kid（鍵のローテーション）。間隔をあけて取り直す
	if j.keys != nil && now.Sub(j.fetchedAt) < jwksMinRefetch {
		return nil, errors.New("unknown kid")
	}
	keys, err := j.fetch()
	if err != nil {
		return nil, err
	}
	j.keys, j.fetchedAt = keys, now
	if k, ok := keys[kid]; ok {
		return k, nil
	}
	return nil, errors.New("unknown kid")
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (j *JWKSKeyfunc) fetch() (map[string]*rsa.PublicKey, error) {
	resp, err := j.client.Get(j.url)
	if err != nil {
		return nil, fmt.Errorf("fetch jwks: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch jwks: status %d", resp.StatusCode)
	}
	var body struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, jwksMaxBytes)).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode jwks: %w", err)
	}
	keys := map[string]*rsa.PublicKey{}
	for _, k := range body.Keys {
		if k.Kty != "RSA" || k.Kid == "" {
			continue
		}
		n, err1 := base64.RawURLEncoding.DecodeString(k.N)
		e, err2 := base64.RawURLEncoding.DecodeString(k.E)
		if err1 != nil || err2 != nil || len(n) == 0 || len(e) == 0 {
			continue
		}
		exp := new(big.Int).SetBytes(e)
		if !exp.IsInt64() || exp.Int64() <= 1 || exp.Int64() > 1<<31-1 {
			continue
		}
		keys[k.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(exp.Int64())}
	}
	if len(keys) == 0 {
		return nil, errors.New("jwks has no usable keys")
	}
	return keys, nil
}
