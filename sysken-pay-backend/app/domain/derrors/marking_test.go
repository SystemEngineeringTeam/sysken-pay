package derrors_test

import (
	"errors"
	"testing"
	"time"

	"sysken-pay-api/app/domain/derrors"
	"sysken-pay-api/app/domain/object/charge"
	"sysken-pay-api/app/domain/object/item"
	"sysken-pay-api/app/domain/object/purchase"
	"sysken-pay-api/app/domain/object/user"
)

// 利用者の入力に由来する検証エラーは ErrInvalidInput（API で 400）になること
func TestInputValidationIsInvalidInput(t *testing.T) {
	var u user.User
	var it item.Item
	var c charge.Charge

	_, purchaseItemErr := purchase.NewPurchaseItem(1, 0)
	_, emptyItemsErr := purchase.NewPurchase("20K23099", nil)

	cases := map[string]error{
		"学籍番号の形式":     u.SetUserID("abc"),
		"学籍番号が空":      u.SetUserID(""),
		"名前が空":        u.SetUserName(""),
		"JANコードの桁数":   it.SetJanCode("123"),
		"JANコードが数字以外": it.SetJanCode("abcdefgh"),
		"商品名が空":       it.SetName(""),
		"価格がマイナス":     it.SetPrice(-1),
		"チャージ金額":      c.SetAmount(123),
		"購入数が0":       purchaseItemErr,
		"購入する商品が空":    emptyItemsErr,
	}
	for name, err := range cases {
		if err == nil {
			t.Errorf("%s: エラーにならなかった", name)
			continue
		}
		if !errors.Is(err, derrors.ErrInvalidInput) {
			t.Errorf("%s: ErrInvalidInput ではない: %v", name, err)
		}
	}
}

// 入力に由来しない検証（サーバー側の不整合）は ErrInvalidInput にしない（500 のまま）
func TestServerSideValidationIsNotInvalidInput(t *testing.T) {
	var u user.User
	future := time.Now().Add(24 * time.Hour)

	if err := u.SetCreatedAt(future); err == nil || errors.Is(err, derrors.ErrInvalidInput) {
		t.Errorf("未来の作成日時は 400 にしない: %v", err)
	}
}
