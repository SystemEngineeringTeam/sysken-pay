// Package paymentcard はスマホに保存する「支払い用バーコード」の値を扱う。
// 設計は docs/phone-payment.md を参照。
package paymentcard

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"sysken-pay-api/app/domain/derrors"
)

const (
	// Prefix は支払い用バーコードの目印。商品の JAN コード（数字だけ）と区別するため
	Prefix = "SP"
	// BodyLength は Prefix のあとに続くランダムな文字の数
	BodyLength = 16
	// Alphabet は使う文字（32種類）。英大文字と数字だけで、見間違えやすい 0 O 1 I は使わない。
	// バーコードリーダーはキーボードとして入力するので、配列の違いで化ける記号は使わない
	Alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
)

// CodeLength は支払い用バーコードの文字数（目印を含む）
const CodeLength = len(Prefix) + BodyLength

// ErrInvalidCode は支払い用バーコードの形式が正しくないことを表す（API では 400）
var ErrInvalidCode = derrors.Invalid("invalid payment code")

// GenerateCode は推測できない支払い用バーコードの文字列を作る。
// 暗号論的に安全な乱数（crypto/rand）を使う。
func GenerateCode() (string, error) {
	buf := make([]byte, BodyLength)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	var b strings.Builder
	b.Grow(CodeLength)
	b.WriteString(Prefix)
	for _, v := range buf {
		// 256 は 32 で割り切れるので、余りを取っても偏らない
		b.WriteByte(Alphabet[int(v)%len(Alphabet)])
	}
	return b.String(), nil
}

// NormalizeCode は読み取った・入力された文字列を正しい形にそろえて検証する。
//   - 前後の空白、途中の空白・ハイフン（4文字ずつ区切って表示したもの）を取り除く
//   - 小文字は大文字にする
//
// 形式が正しくなければ ErrInvalidCode を返す。
func NormalizeCode(input string) (string, error) {
	s := strings.ToUpper(input)
	s = strings.NewReplacer(" ", "", "-", "", "\t", "", "\r", "", "\n", "").Replace(s)

	if len(s) != CodeLength || !strings.HasPrefix(s, Prefix) {
		return "", ErrInvalidCode
	}
	for _, c := range s[len(Prefix):] {
		if !strings.ContainsRune(Alphabet, c) {
			return "", ErrInvalidCode
		}
	}
	return s, nil
}

// LooksLikeCode は文字列が支払い用バーコードらしいか（目印で始まるか）を返す。
// 商品の読み取り画面で、間違えて読ませたことに気づかせるために使う。
func LooksLikeCode(input string) bool {
	return strings.HasPrefix(strings.ToUpper(strings.TrimSpace(input)), Prefix)
}

// HashCode は DB に保存するためのハッシュ（SHA-256 の16進文字列）を返す。
// 支払い用バーコードの文字列そのものは DB にもログにも残さない。
func HashCode(code string) string {
	sum := sha256.Sum256([]byte(code))
	return hex.EncodeToString(sum[:])
}

// DisplayCode は画面に出すための見やすい形を返す。
// 目印のあとを4文字ずつ区切る（例: SP 7Q2K X9MD RA4T W8YZ）。手で入力する人のため。
func DisplayCode(code string) string {
	if !strings.HasPrefix(code, Prefix) {
		return code
	}
	parts := []string{Prefix}
	body := code[len(Prefix):]
	for i := 0; i < len(body); i += 4 {
		end := i + 4
		if end > len(body) {
			end = len(body)
		}
		parts = append(parts, body[i:end])
	}
	return strings.Join(parts, " ")
}
