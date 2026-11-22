package repository

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"sysken-pay-api/app/domain/object/purchase"
)

// 買ったあとの残高（チャージ 1000 − 購入 300 = 700）が、返す Purchase に入っていること。
// 以前は balance を一度もセットせず、レスポンスがいつも 0 になっていた
func TestCreatePurchase_ReturnsBalanceAfterPurchase(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	item, err := purchase.NewPurchaseItem(1, 2)
	if err != nil {
		t.Fatal(err)
	}
	p, err := purchase.NewPurchase("24K24042", []purchase.PurchaseItem{item})
	if err != nil {
		t.Fatal(err)
	}

	mock.ExpectQuery("SELECT price FROM item").WithArgs(1).
		WillReturnRows(sqlmock.NewRows([]string{"price"}).AddRow(150))
	mock.ExpectExec("INSERT INTO purchase ").WithArgs("24K24042").
		WillReturnResult(sqlmock.NewResult(10, 1))
	mock.ExpectPrepare("INSERT INTO purchase_item")
	mock.ExpectExec("INSERT INTO purchase_item").WithArgs(int64(10), 1, 2, 150).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec("INSERT INTO balance").WithArgs("24K24042", int64(10), -300).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectQuery("SELECT IFNULL\\(SUM\\(amount\\), 0\\) FROM balance").WithArgs("24K24042").
		WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(700))

	got, err := NewPurchaseRepository(db).CreatePurchase(context.Background(), p)
	if err != nil {
		t.Fatal(err)
	}
	if got.Balance() != 700 {
		t.Errorf("Balance() = %d, want 700", got.Balance())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}
