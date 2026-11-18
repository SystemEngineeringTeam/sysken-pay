// Package derrors はドメイン層のエラーの種類を表す。
package derrors

import "errors"

// ErrInvalidInput は「利用者の入力が不正」なことを表す共通マーカー。
// API では 400 Bad Request にマッピングする。
//
// 入力に由来しない検証（DB から読んだ時刻が未来、など）には付けない。
// それはサーバー側の不整合なので 500 のままにする。
var ErrInvalidInput = errors.New("invalid input")

// invalidInputError はメッセージをそのまま保ちつつ、errors.Is(err, ErrInvalidInput) を true にする。
type invalidInputError struct{ msg string }

func (e *invalidInputError) Error() string        { return e.msg }
func (e *invalidInputError) Is(target error) bool { return target == ErrInvalidInput }

// Invalid は入力が不正なことを表すエラーを作る（errors.New の代わりに使う）。
func Invalid(msg string) error {
	return &invalidInputError{msg: msg}
}
