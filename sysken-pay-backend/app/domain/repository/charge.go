package repository

import (
	"context"
	"sysken-pay-api/app/domain/object/charge"
)

//TODO　お金をチャージするインターフェースを作成する
//データベースで必要な入力と出力のインターフェースの作成

type ChargeRepository interface {
	// お金をチャージする
	// チャージに成功した場合はチャージした金額を返す
	ChargeAmount(ctx context.Context, c *charge.Charge) (*charge.Charge, error)
}
