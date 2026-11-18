package paymentcard

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"

	"sysken-pay-api/app/domain/derrors"
)

// 発行用 QR（claim）。設計は docs/phone-payment.md の「発行用 QR」を参照。
//
// DB には支払い用バーコードのハッシュしかないので、スマホに渡すために、
// 発行した支払い用バーコードを「QR に入れるトークン」から作った鍵で暗号化して、5分間だけ保存する。
// トークンは DB にもログにも残さない（DB にはトークンのハッシュだけ）。
// なので DB が漏れても、QR を持っていない人は支払い用バーコードを取り出せない。

const (
	// ClaimTTLSeconds は発行用 QR が使える時間（5分）
	ClaimTTLSeconds = 5 * 60
	claimTokenBytes = 32
	claimKeyContext = "sysken-pay/payment-card-claim/v1:"
)

// ErrInvalidClaimToken は発行用 QR のトークンの形式が正しくないことを表す（API では 400）
var ErrInvalidClaimToken = derrors.Invalid("invalid claim token")

// ErrClaimDecrypt は暗号文が壊れている・鍵が違うことを表す
var ErrClaimDecrypt = errors.New("failed to decrypt claim")

// Claim は発行用 QR の保存内容
type Claim struct {
	ID               int64
	UserID           string
	SealedCode       []byte
	OpenCount        int
	RemainingSeconds int // 0 以下なら期限切れ
}

// Expired は期限が切れているかを返す
func (c *Claim) Expired() bool { return c.RemainingSeconds <= 0 }

// GenerateClaimToken は QR に入れるトークンを作る（32バイトの乱数を URL で使える形にしたもの。43文字）
func GenerateClaimToken() (string, error) {
	buf := make([]byte, claimTokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// ValidateClaimToken はトークンの形式を確かめる
func ValidateClaimToken(token string) error {
	b, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(b) != claimTokenBytes {
		return ErrInvalidClaimToken
	}
	return nil
}

// HashClaimToken は DB に保存するトークンのハッシュを返す
func HashClaimToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func claimKey(token string) []byte {
	sum := sha256.Sum256([]byte(claimKeyContext + token))
	return sum[:]
}

// SealCode は支払い用バーコードを、トークンから作った鍵で暗号化する（AES-256-GCM）
func SealCode(token, code string) ([]byte, error) {
	block, err := aes.NewCipher(claimKey(token))
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return gcm.Seal(nonce, nonce, []byte(code), nil), nil
}

// OpenCode は SealCode で暗号化したものを、トークンで元に戻す
func OpenCode(token string, sealed []byte) (string, error) {
	block, err := aes.NewCipher(claimKey(token))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(sealed) < gcm.NonceSize() {
		return "", ErrClaimDecrypt
	}
	nonce, ct := sealed[:gcm.NonceSize()], sealed[gcm.NonceSize():]
	plain, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", ErrClaimDecrypt
	}
	return string(plain), nil
}
