package repository

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"sysken-pay-api/app/domain/repository"

	"github.com/DATA-DOG/go-sqlmock"
)

func newAllowlistRepoForTest(t *testing.T) (*AdminAllowlistRepositoryImpl, sqlmock.Sqlmock) {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return NewAdminAllowlistRepository(db), mock
}

func TestAdminAllowlist_Exists(t *testing.T) {
	repo, mock := newAllowlistRepoForTest(t)
	mock.ExpectQuery("FROM admin_allowlist WHERE upn").WithArgs("a@aitech.ac.jp").
		WillReturnRows(sqlmock.NewRows([]string{"1"}).AddRow(1))
	mock.ExpectQuery("FROM admin_allowlist WHERE upn").WithArgs("b@aitech.ac.jp").WillReturnError(sql.ErrNoRows)

	if ok, err := repo.Exists(context.Background(), "a@aitech.ac.jp"); err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if ok, err := repo.Exists(context.Background(), "b@aitech.ac.jp"); err != nil || ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
}

func TestAdminAllowlist_List(t *testing.T) {
	repo, mock := newAllowlistRepoForTest(t)
	now := time.Now()
	mock.ExpectQuery("FROM admin_allowlist").WillReturnRows(
		sqlmock.NewRows([]string{"upn", "student_id", "added_by", "created_at"}).
			AddRow("x24042xx@aitech.ac.jp", "X24042", "password", now).
			AddRow("sysken@aitech.ac.jp", nil, "x24042xx@aitech.ac.jp", now))

	got, err := repo.List(context.Background())
	if err != nil || len(got) != 2 {
		t.Fatalf("got=%v err=%v", got, err)
	}
	if got[0].StudentID != "X24042" || got[1].StudentID != "" {
		t.Fatalf("student_id: %+v", got)
	}
}

func TestAdminAllowlist_Insert(t *testing.T) {
	repo, mock := newAllowlistRepoForTest(t)
	mock.ExpectExec("INSERT IGNORE INTO admin_allowlist").
		WithArgs("sysken@aitech.ac.jp", nil, "password").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("INSERT IGNORE INTO admin_allowlist").
		WithArgs("sysken@aitech.ac.jp", nil, "password").WillReturnResult(sqlmock.NewResult(0, 0))

	a := repository.AdminAllow{UPN: "sysken@aitech.ac.jp", AddedBy: "password"}
	if ok, err := repo.Insert(context.Background(), a); err != nil || !ok {
		t.Fatalf("1回目 ok=%v err=%v", ok, err)
	}
	if ok, err := repo.Insert(context.Background(), a); err != nil || ok {
		t.Fatalf("2回目は追加されない ok=%v err=%v", ok, err)
	}
}

func TestAdminAllowlist_LockAllとDelete(t *testing.T) {
	repo, mock := newAllowlistRepoForTest(t)
	mock.ExpectQuery("FOR UPDATE").WillReturnRows(sqlmock.NewRows([]string{"upn"}).AddRow("a").AddRow("b"))
	mock.ExpectExec("DELETE FROM admin_allowlist WHERE upn").WithArgs("a").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("DELETE FROM admin_allowlist WHERE upn").WithArgs("zz").WillReturnResult(sqlmock.NewResult(0, 0))

	upns, err := repo.LockAll(context.Background())
	if err != nil || len(upns) != 2 {
		t.Fatalf("upns=%v err=%v", upns, err)
	}
	if ok, err := repo.Delete(context.Background(), "a"); err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if ok, err := repo.Delete(context.Background(), "zz"); err != nil || ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
}

func TestAdminAllowlist_ExistsByStudentID(t *testing.T) {
	repo, mock := newAllowlistRepoForTest(t)
	mock.ExpectQuery("FROM admin_allowlist WHERE student_id").WithArgs("X24042").
		WillReturnRows(sqlmock.NewRows([]string{"1"}).AddRow(1))
	mock.ExpectQuery("FROM admin_allowlist WHERE student_id").WithArgs("K23099").WillReturnError(sql.ErrNoRows)

	if ok, err := repo.ExistsByStudentID(context.Background(), "X24042"); err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if ok, err := repo.ExistsByStudentID(context.Background(), "K23099"); err != nil || ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	// 空の学籍番号は DB に問い合わせず false（NULL の行に一致させない）
	if ok, err := repo.ExistsByStudentID(context.Background(), ""); err != nil || ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
