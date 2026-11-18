package purchase

import (
	"errors"
	"fmt"
)

// ErrInsufficientBalance は残高が購入金額に足りないことを表す。
// 利用者起因の正常な業務結果なので、API では 400 にマッピングする。
var ErrInsufficientBalance = errors.New("insufficient balance")

// CanPurchase はユーザーの残高が購入金額以上かを検証するドメインサービス
func CanPurchase(balance, totalAmount int) error {
	if balance < totalAmount {
		return fmt.Errorf("%w: balance=%d, total=%d", ErrInsufficientBalance, balance, totalAmount)
	}
	return nil
}
