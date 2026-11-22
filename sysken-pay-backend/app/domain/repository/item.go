package repository

import (
	"context"
	"sysken-pay-api/app/domain/object/item"
)

//TODO　商品を登録するインターフェースを作成する
//データベースで必要な入力と出力のインターフェースの作成
//TODO 商品を取得するインターフェースを作成する

type ItemRepository interface {
	// 商品を新規作成して保存する
	// 保存に成功した場合は保存した商品を返す
	InsertItem(ctx context.Context, item *item.Item) (*item.Item, error)

	// 商品を更新する
	// 更新に成功した場合は更新した商品を返す
	UpdateItem(ctx context.Context, item *item.Item) (*item.Item, error)

	// 商品をIDで取得する。無効の商品は nil（購入では買えない商品として扱う）
	// 取得に成功した場合は取得した商品を返す
	GetItemByID(ctx context.Context, id int) (*item.Item, error)

	// 商品をJANコードで取得する。無効の商品も返す（Disabled() で区別する）。無ければ nil
	// 取得に成功した場合は取得した商品を返す
	GetItemByJanCode(ctx context.Context, janCode string) (*item.Item, error)

	// 商品を全て取得する。includeDisabled が false なら有効な商品だけ
	GetAllItems(ctx context.Context, includeDisabled bool) ([]*item.Item, error)

	// 商品を無効（disabled=true）／有効（false）にする
	// found は商品があるか、changed は状態が実際に変わったか（すでにその状態なら false）
	SetItemDisabled(ctx context.Context, janCode string, disabled bool) (found bool, changed bool, err error)
}
