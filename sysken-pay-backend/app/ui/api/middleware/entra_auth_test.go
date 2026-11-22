package middleware

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	testTenant = "11111111-1111-1111-1111-111111111111"
	testClient = "22222222-2222-2222-2222-222222222222"
	testKid    = "kid-1"
)

func newKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	k, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	return k
}

func staticKeyfunc(pub *rsa.PublicKey) jwt.Keyfunc {
	return func(*jwt.Token) (any, error) { return pub, nil }
}

type tokenOpts struct {
	iss, aud, tid, upn string
	exp, nbf           time.Time
	method             jwt.SigningMethod
	key                any
	kid                string
}

func goodOpts(key *rsa.PrivateKey) tokenOpts {
	return tokenOpts{
		iss: entraAuthority + testTenant + "/v2.0", aud: testClient, tid: testTenant,
		upn: "X24042XX@aitech.ac.jp", exp: time.Now().Add(time.Hour),
		method: jwt.SigningMethodRS256, key: key, kid: testKid,
	}
}

func makeToken(t *testing.T, o tokenOpts) string {
	t.Helper()
	claims := jwt.MapClaims{"iss": o.iss, "aud": o.aud, "tid": o.tid, "preferred_username": o.upn}
	if !o.exp.IsZero() {
		claims["exp"] = o.exp.Unix()
	}
	if !o.nbf.IsZero() {
		claims["nbf"] = o.nbf.Unix()
	}
	tok := jwt.NewWithClaims(o.method, claims)
	tok.Header["kid"] = o.kid
	s, err := tok.SignedString(o.key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestEntraVerifier_Verify(t *testing.T) {
	key := newKey(t)
	other := newKey(t)
	v := NewEntraVerifier(testTenant, testClient, staticKeyfunc(&key.PublicKey))

	cases := []struct {
		name   string
		mutate func(*tokenOpts)
		ok     bool
	}{
		{"正しいトークン", func(*tokenOpts) {}, true},
		{"署名が違う（別の鍵）", func(o *tokenOpts) { o.key = other }, false},
		{"期限切れ", func(o *tokenOpts) { o.exp = time.Now().Add(-time.Hour) }, false},
		{"expなし", func(o *tokenOpts) { o.exp = time.Time{} }, false},
		{"まだ有効でない（nbf）", func(o *tokenOpts) { o.nbf = time.Now().Add(time.Hour) }, false},
		{"別のテナントの iss", func(o *tokenOpts) { o.iss = entraAuthority + "99999999-9999-9999-9999-999999999999/v2.0" }, false},
		{"別の aud", func(o *tokenOpts) { o.aud = "other-client" }, false},
		{"別の tid", func(o *tokenOpts) { o.tid = "99999999-9999-9999-9999-999999999999" }, false},
		{"tid なし", func(o *tokenOpts) { o.tid = "" }, false},
		{"UPN なし", func(o *tokenOpts) { o.upn = "" }, false},
		{"RS256 以外（HS256）", func(o *tokenOpts) { o.method = jwt.SigningMethodHS256; o.key = []byte("secret") }, false},
		{"alg=none", func(o *tokenOpts) { o.method = jwt.SigningMethodNone; o.key = jwt.UnsafeAllowNoneSignatureType }, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			o := goodOpts(key)
			c.mutate(&o)
			upn, err := v.Verify(context.Background(), makeToken(t, o))
			if c.ok {
				if err != nil || upn != "x24042xx@aitech.ac.jp" {
					t.Fatalf("upn=%q err=%v（小文字になるはず）", upn, err)
				}
				return
			}
			if !errors.Is(err, ErrInvalidToken) {
				t.Fatalf("拒否されるはず: upn=%q err=%v", upn, err)
			}
		})
	}

	if _, err := v.Verify(context.Background(), "not-a-jwt"); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("JWT でない文字列: %v", err)
	}
}

func TestNewEntraVerifier_未設定はnil(t *testing.T) {
	kf := staticKeyfunc(&newKey(t).PublicKey)
	for _, c := range []struct{ tenant, client string }{{"", testClient}, {testTenant, ""}, {"", ""}} {
		if NewEntraVerifier(c.tenant, c.client, kf) != nil {
			t.Errorf("%+v は nil のはず", c)
		}
	}
}

type fakeVerifier struct {
	upn string
	err error
}

func (f fakeVerifier) Verify(context.Context, string) (string, error) { return f.upn, f.err }

type fakeAllow struct {
	allowed map[string]bool
	err     error
}

func (f fakeAllow) Exists(_ context.Context, upn string) (bool, error) { return f.allowed[upn], f.err }

func serve(h http.Handler, authz string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	if authz != "" {
		req.Header.Set("Authorization", authz)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestEntraAuth(t *testing.T) {
	var gotUPN string
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUPN, _ = AdminUPNFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	})
	allow := fakeAllow{allowed: map[string]bool{"x24042xx@aitech.ac.jp": true}}

	cases := []struct {
		name  string
		v     TokenVerifier
		allow AllowChecker
		authz string
		want  int
	}{
		{"許可リストにいる", fakeVerifier{upn: "x24042xx@aitech.ac.jp"}, allow, "Bearer tok", 200},
		{"scheme は大文字小文字を区別しない", fakeVerifier{upn: "x24042xx@aitech.ac.jp"}, allow, "bearer tok", 200},
		{"許可リストにいない→403", fakeVerifier{upn: "k23099kk@aitech.ac.jp"}, allow, "Bearer tok", 403},
		{"トークン不正→401", fakeVerifier{err: ErrInvalidToken}, allow, "Bearer tok", 401},
		{"ヘッダーなし→401", fakeVerifier{upn: "x24042xx@aitech.ac.jp"}, allow, "", 401},
		{"Basic は Entra では通らない→401", fakeVerifier{upn: "x24042xx@aitech.ac.jp"}, allow, "Basic YWRtaW46cGFzcw==", 401},
		{"許可リストを引けない→500", fakeVerifier{upn: "x24042xx@aitech.ac.jp"}, fakeAllow{err: errors.New("db down")}, "Bearer tok", 500},
		{"Entra 未設定（nil）はすべて 401", nil, allow, "Bearer tok", 401},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			gotUPN = ""
			rec := serve(EntraAuth(c.v, c.allow)(next), c.authz)
			if rec.Code != c.want {
				t.Fatalf("code=%d want=%d", rec.Code, c.want)
			}
			if c.want == 200 && gotUPN != "x24042xx@aitech.ac.jp" {
				t.Fatalf("UPN が context に入っていない: %q", gotUPN)
			}
			if c.want != 200 && gotUPN != "" {
				t.Fatal("拒否したのに next が呼ばれた")
			}
		})
	}
}

func TestAdminAuth_BearerはEntraへBasicはBasicへ(t *testing.T) {
	var reached atomic.Int32
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { reached.Add(1) })
	entra := EntraAuth(fakeVerifier{upn: "x24042xx@aitech.ac.jp"}, fakeAllow{allowed: map[string]bool{"x24042xx@aitech.ac.jp": true}})
	h := AdminAuth(BasicAuth("admin", "pass"), entra)(next)

	basicReq := func(user, pass string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.SetBasicAuth(user, pass)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}

	if rec := basicReq("admin", "pass"); rec.Code != 200 {
		t.Fatalf("Basic 正: %d", rec.Code)
	}
	if rec := basicReq("admin", "wrong"); rec.Code != 401 {
		t.Fatalf("Basic 誤: %d", rec.Code)
	}
	if rec := serve(h, ""); rec.Code != 401 {
		t.Fatalf("認証なし: %d", rec.Code)
	}
	if rec := serve(h, "Bearer tok"); rec.Code != 200 {
		t.Fatalf("Bearer 正: %d", rec.Code)
	}
	if reached.Load() != 2 {
		t.Fatalf("next の呼び出し回数 %d", reached.Load())
	}

	// Entra 未設定でも、Basic は今まで通り通り、Bearer だけ拒否される
	h2 := AdminAuth(BasicAuth("admin", "pass"), EntraAuth(nil, fakeAllow{}))(next)
	if rec := serve(h2, "Bearer tok"); rec.Code != 401 {
		t.Fatalf("Entra 未設定の Bearer: %d", rec.Code)
	}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.SetBasicAuth("admin", "pass")
	rec := httptest.NewRecorder()
	h2.ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("Entra 未設定でも Basic は通る: %d", rec.Code)
	}
}

func jwksJSON(kid string, pub *rsa.PublicKey) string {
	b, _ := json.Marshal(map[string]any{"keys": []map[string]string{{
		"kty": "RSA", "kid": kid,
		"n": base64.RawURLEncoding.EncodeToString(pub.N.Bytes()),
		"e": base64.RawURLEncoding.EncodeToString([]byte{1, 0, 1}),
	}}})
	return string(b)
}

func TestJWKSKeyfunc(t *testing.T) {
	key := newKey(t)
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		_, _ = w.Write([]byte(jwksJSON(testKid, &key.PublicKey)))
	}))
	defer srv.Close()

	now := time.Now()
	j := newJWKSKeyfunc(srv.URL, srv.Client(), func() time.Time { return now })
	v := NewEntraVerifier(testTenant, testClient, j.Keyfunc)

	tok := makeToken(t, goodOpts(key))
	for i := 0; i < 3; i++ {
		if _, err := v.Verify(context.Background(), tok); err != nil {
			t.Fatal(err)
		}
	}
	if hits.Load() != 1 {
		t.Fatalf("キャッシュされるはず: %d 回", hits.Load())
	}

	// 知らない kid: 取得から間もないうちは取りに行かない
	o := goodOpts(key)
	o.kid = "unknown"
	if _, err := v.Verify(context.Background(), makeToken(t, o)); err == nil {
		t.Fatal("知らない kid は拒否")
	}
	if hits.Load() != 1 {
		t.Fatalf("間隔内は再取得しない: %d 回", hits.Load())
	}

	// 間隔をあけると、鍵の入れ替わりを見に行く
	now = now.Add(jwksMinRefetch + time.Second)
	if _, err := v.Verify(context.Background(), makeToken(t, o)); err == nil {
		t.Fatal("知らない kid は拒否")
	}
	if hits.Load() != 2 {
		t.Fatalf("間隔後は再取得する: %d 回", hits.Load())
	}

	// TTL が切れたら取り直す
	now = now.Add(jwksTTL + time.Second)
	if _, err := v.Verify(context.Background(), tok); err != nil {
		t.Fatal(err)
	}
	if hits.Load() != 3 {
		t.Fatalf("TTL 後は再取得する: %d 回", hits.Load())
	}
}

func TestJWKSKeyfunc_取得失敗は拒否(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, strings.Repeat("x", 10), http.StatusInternalServerError)
	}))
	defer srv.Close()
	key := newKey(t)
	j := newJWKSKeyfunc(srv.URL, srv.Client(), time.Now)
	v := NewEntraVerifier(testTenant, testClient, j.Keyfunc)
	if _, err := v.Verify(context.Background(), makeToken(t, goodOpts(key))); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("JWKS が取れないときは拒否: %v", err)
	}
}
