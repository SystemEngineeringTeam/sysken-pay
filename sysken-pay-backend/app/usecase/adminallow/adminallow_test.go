package adminallow

import (
	"context"
	"errors"
	"testing"

	"sysken-pay-api/app/domain/derrors"
	"sysken-pay-api/app/domain/repository"
)

type fakeRepo struct {
	rows      map[string]repository.AdminAllow
	deleteHit int
}

func newFake(upns ...string) *fakeRepo {
	f := &fakeRepo{rows: map[string]repository.AdminAllow{}}
	for _, u := range upns {
		f.rows[u] = repository.AdminAllow{UPN: u}
	}
	return f
}

func (f *fakeRepo) Exists(_ context.Context, upn string) (bool, error) {
	_, ok := f.rows[upn]
	return ok, nil
}
func (f *fakeRepo) List(context.Context) ([]repository.AdminAllow, error) {
	var l []repository.AdminAllow
	for _, r := range f.rows {
		l = append(l, r)
	}
	return l, nil
}
func (f *fakeRepo) Insert(_ context.Context, a repository.AdminAllow) (bool, error) {
	if _, ok := f.rows[a.UPN]; ok {
		return false, nil
	}
	f.rows[a.UPN] = a
	return true, nil
}
func (f *fakeRepo) LockAll(context.Context) ([]string, error) {
	var l []string
	for u := range f.rows {
		l = append(l, u)
	}
	return l, nil
}
func (f *fakeRepo) Delete(_ context.Context, upn string) (bool, error) {
	f.deleteHit++
	if _, ok := f.rows[upn]; !ok {
		return false, nil
	}
	delete(f.rows, upn)
	return true, nil
}

type fakeTx struct{}

func (fakeTx) Do(ctx context.Context, f func(ctx context.Context) error) error { return f(ctx) }

func TestAdd(t *testing.T) {
	f := newFake()
	uc := NewUseCase(f, fakeTx{})

	a, err := uc.Add(context.Background(), " X24042XX@aitech.ac.jp ", "password")
	if err != nil || a.UPN != "x24042xx@aitech.ac.jp" || a.StudentID != "X24042" || a.AddedBy != "password" {
		t.Fatalf("a=%+v err=%v", a, err)
	}

	// システムアカウントは学籍番号が空のまま入る
	s, err := uc.Add(context.Background(), "sysken@aitech.ac.jp", "x24042xx@aitech.ac.jp")
	if err != nil || s.StudentID != "" {
		t.Fatalf("s=%+v err=%v", s, err)
	}

	if _, err := uc.Add(context.Background(), "x24042xx@aitech.ac.jp", "password"); !errors.Is(err, ErrAlreadyAllowed) {
		t.Fatalf("2回目は ErrAlreadyAllowed のはず: %v", err)
	}
	for _, bad := range []string{"", "someone@example.com", "admin@aitech.ac.jp"} {
		if _, err := uc.Add(context.Background(), bad, "password"); !errors.Is(err, derrors.ErrInvalidInput) {
			t.Errorf("%q は入力不正のはず: %v", bad, err)
		}
	}
}

func TestRemove(t *testing.T) {
	const a, b = "x24042xx@aitech.ac.jp", "k23099kk@aitech.ac.jp"

	t.Run("消せる", func(t *testing.T) {
		f := newFake(a, b)
		if err := NewUseCase(f, fakeTx{}).Remove(context.Background(), b, a); err != nil {
			t.Fatal(err)
		}
		if _, ok := f.rows[b]; ok {
			t.Fatal("消えていない")
		}
	})
	t.Run("最後の1人は消せない", func(t *testing.T) {
		f := newFake(a)
		if err := NewUseCase(f, fakeTx{}).Remove(context.Background(), a, "password"); !errors.Is(err, ErrLastAdmin) {
			t.Fatalf("err=%v", err)
		}
		if f.deleteHit != 0 || len(f.rows) != 1 {
			t.Fatal("消してはいけない")
		}
	})
	t.Run("自分自身は消せない", func(t *testing.T) {
		f := newFake(a, b)
		if err := NewUseCase(f, fakeTx{}).Remove(context.Background(), a, a); !errors.Is(err, ErrSelf) {
			t.Fatalf("err=%v", err)
		}
		if len(f.rows) != 2 {
			t.Fatal("消してはいけない")
		}
	})
	t.Run("いない人は NotFound", func(t *testing.T) {
		f := newFake(a, b)
		if err := NewUseCase(f, fakeTx{}).Remove(context.Background(), "sysken@aitech.ac.jp", "password"); !errors.Is(err, ErrNotFound) {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("形が不正なら入力不正", func(t *testing.T) {
		if err := NewUseCase(newFake(a, b), fakeTx{}).Remove(context.Background(), "nope", "password"); !errors.Is(err, derrors.ErrInvalidInput) {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("大文字小文字は区別しない", func(t *testing.T) {
		f := newFake(a, b)
		if err := NewUseCase(f, fakeTx{}).Remove(context.Background(), "K23099KK@AITECH.AC.JP", "password"); err != nil {
			t.Fatal(err)
		}
	})
}
