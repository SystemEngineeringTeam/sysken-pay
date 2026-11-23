package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"sysken-pay-api/app/domain/object/charge"
	"sysken-pay-api/app/infra/transaction"
)

func newTestCharge(t *testing.T, amount int) *charge.Charge {
	t.Helper()
	c, err := charge.NewCharge("24K24042", amount)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

// チャージ後の残高が、返す Charge に入っていること（成功パス・COMMIT される）。
func TestChargeAmount_CommitsChargeAndBalanceTogether(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO charge").WithArgs("24K24042", 1000, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(10, 1))
	mock.ExpectExec("INSERT INTO balance").WithArgs("24K24042", int64(10), 1000, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectQuery("SELECT IFNULL\\(SUM\\(amount\\), 0\\) FROM balance").WithArgs("24K24042").
		WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(1500))
	mock.ExpectCommit()

	repo := NewChargeRepository(db)
	var got *charge.Charge
	err = transaction.NewTransaction(db).Do(context.Background(), func(ctx context.Context) error {
		var err error
		got, err = repo.ChargeAmount(ctx, newTestCharge(t, 1000))
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.ID() != 10 || got.Balance() != 1500 {
		t.Errorf("ID=%d Balance=%d, want 10 / 1500", got.ID(), got.Balance())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

// balance の INSERT が失敗したら、charge の行も残らないこと（ROLLBACK され、COMMIT されない）。
// issue #75: 以前は charge だけ確定して、残高が増えない状態になった
func TestChargeAmount_BalanceInsertFailureRollsBackCharge(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO charge").WillReturnResult(sqlmock.NewResult(10, 1))
	mock.ExpectExec("INSERT INTO balance").WillReturnError(errors.New("connection lost"))
	mock.ExpectRollback() // COMMIT ではなく ROLLBACK を期待する

	repo := NewChargeRepository(db)
	err = transaction.NewTransaction(db).Do(context.Background(), func(ctx context.Context) error {
		_, err := repo.ChargeAmount(ctx, newTestCharge(t, 1000))
		return err
	})
	if err == nil {
		t.Fatal("balance の INSERT が失敗したのにエラーが返らない")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

// 残高の集計が失敗したときも ROLLBACK されること。
func TestChargeAmount_SumFailureRollsBack(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO charge").WillReturnResult(sqlmock.NewResult(10, 1))
	mock.ExpectExec("INSERT INTO balance").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectQuery("SELECT IFNULL").WillReturnError(errors.New("connection lost"))
	mock.ExpectRollback()

	repo := NewChargeRepository(db)
	err = transaction.NewTransaction(db).Do(context.Background(), func(ctx context.Context) error {
		_, err := repo.ChargeAmount(ctx, newTestCharge(t, 500))
		return err
	})
	if err == nil {
		t.Fatal("集計が失敗したのにエラーが返らない")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

// 集計した残高が負のとき（SetBalance が断る）は、黙って 0 を返さずエラーにして ROLLBACK すること。
func TestChargeAmount_NegativeBalanceIsAnError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO charge").WillReturnResult(sqlmock.NewResult(10, 1))
	mock.ExpectExec("INSERT INTO balance").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectQuery("SELECT IFNULL").WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(-100))
	mock.ExpectRollback()

	repo := NewChargeRepository(db)
	err = transaction.NewTransaction(db).Do(context.Background(), func(ctx context.Context) error {
		_, err := repo.ChargeAmount(ctx, newTestCharge(t, 500))
		return err
	})
	if err == nil {
		t.Fatal("残高が負なのにエラーが返らない")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

// LastInsertId が 0 以下（SetID が断る）なら、エラーにして ROLLBACK すること。balance に charge_id=0 を入れない。
func TestChargeAmount_InvalidInsertIDRollsBack(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO charge").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectRollback()

	repo := NewChargeRepository(db)
	err = transaction.NewTransaction(db).Do(context.Background(), func(ctx context.Context) error {
		_, err := repo.ChargeAmount(ctx, newTestCharge(t, 500))
		return err
	})
	if err == nil {
		t.Fatal("ID が 0 なのにエラーが返らない")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}
