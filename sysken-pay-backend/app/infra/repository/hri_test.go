package repository

import (
	"context"
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func newHriRepoForTest(t *testing.T) (*HriRepositoryImpl, sqlmock.Sqlmock) {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return NewHriRepository(db), mock
}

func TestHriRepository_FindActiveUserIDByHash_見つかる(t *testing.T) {
	repo, mock := newHriRepoForTest(t)
	mock.ExpectQuery("FROM payment_card").WithArgs("hash1").
		WillReturnRows(sqlmock.NewRows([]string{"user_id"}).AddRow("24K01234"))

	got, err := repo.FindActiveUserIDByHash(context.Background(), "hash1")
	if err != nil || got != "24K01234" {
		t.Fatalf("got=%q err=%v", got, err)
	}
}

func TestHriRepository_FindActiveUserIDByHash_無ければ空文字(t *testing.T) {
	repo, mock := newHriRepoForTest(t)
	mock.ExpectQuery("FROM payment_card").WithArgs("none").WillReturnError(sql.ErrNoRows)

	got, err := repo.FindActiveUserIDByHash(context.Background(), "none")
	if err != nil || got != "" {
		t.Fatalf("got=%q err=%v", got, err)
	}
}

func TestHriRepository_FindRevokedUserIDByHash_無ければ空文字(t *testing.T) {
	repo, mock := newHriRepoForTest(t)
	mock.ExpectQuery("revoked_at IS NOT NULL").WithArgs("none").WillReturnError(sql.ErrNoRows)

	got, err := repo.FindRevokedUserIDByHash(context.Background(), "none")
	if err != nil || got != "" {
		t.Fatalf("got=%q err=%v", got, err)
	}
}

func TestHriRepository_Insert_テーブル名は昔のまま(t *testing.T) {
	repo, mock := newHriRepoForTest(t)
	mock.ExpectExec("INSERT INTO payment_card").WithArgs("24K01234", "hash1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	if err := repo.Insert(context.Background(), "24K01234", "hash1"); err != nil {
		t.Fatal(err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestHriRepository_RevokeActiveByUserID_行をロックしてから無効にする(t *testing.T) {
	repo, mock := newHriRepoForTest(t)
	mock.ExpectQuery("FOR UPDATE").WithArgs("24K01234").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("24K01234"))
	mock.ExpectExec("UPDATE payment_card SET revoked_at").WithArgs("24K01234").
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := repo.RevokeActiveByUserID(context.Background(), "24K01234"); err != nil {
		t.Fatal(err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestHriRepository_RevokeActiveByUserID_ユーザーがいなければ止まる(t *testing.T) {
	repo, mock := newHriRepoForTest(t)
	mock.ExpectQuery("FOR UPDATE").WithArgs("nobody").WillReturnError(sql.ErrNoRows)

	if err := repo.RevokeActiveByUserID(context.Background(), "nobody"); err == nil {
		t.Fatal("エラーになるはず")
	}
}
