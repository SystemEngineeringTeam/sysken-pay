package user

import (
	"context"
	"errors"
	"strings"
	"testing"

	domainuser "sysken-pay-api/app/domain/object/user"
)

// --- mock ---

type mockUserRepo struct {
	getFunc    func(ctx context.Context, userID string) (*domainuser.User, error)
	insertFunc func(ctx context.Context, u *domainuser.User) (*domainuser.User, error)
	updateFunc func(ctx context.Context, u *domainuser.User) (*domainuser.User, error)
	stopped    bool
	changeFunc func(ctx context.Context, oldID, newID string) error
}

func (m *mockUserRepo) ChangeUserID(ctx context.Context, oldID, newID string) error {
	return m.changeFunc(ctx, oldID, newID)
}

// mockTx はトランザクションの中で呼ばれたかを覚える
type mockTx struct{ called bool }

func (t *mockTx) Do(ctx context.Context, f func(ctx context.Context) error) error {
	t.called = true
	return f(ctx)
}

func (m *mockUserRepo) GetUserByID(ctx context.Context, userID string) (*domainuser.User, error) {
	return m.getFunc(ctx, userID)
}

func (m *mockUserRepo) InsertUser(ctx context.Context, u *domainuser.User) (*domainuser.User, error) {
	return m.insertFunc(ctx, u)
}

func (m *mockUserRepo) UpdateUser(ctx context.Context, u *domainuser.User) (*domainuser.User, error) {
	return m.updateFunc(ctx, u)
}

func (m *mockUserRepo) IsStopped(context.Context, string) (bool, error) {
	return m.stopped, nil
}

// --- GetUser ---

func TestGetUser_Success(t *testing.T) {
	want, err := domainuser.NewUser("20K23099", "田中 太郎")
	if err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}
	repo := &mockUserRepo{
		getFunc: func(_ context.Context, userID string) (*domainuser.User, error) {
			if userID != "20K23099" {
				t.Errorf("userID = %s, want 20K23099", userID)
			}
			return want, nil
		},
	}
	uc := NewGetUserUseCase(repo)
	result, err := uc.GetUser(context.Background(), "20K23099")
	if err != nil {
		t.Fatalf("GetUser should succeed: %v", err)
	}
	if result.ID() != "20K23099" {
		t.Errorf("ID() = %s, want 20K23099", result.ID())
	}
	if result.UserName() != "田中 太郎" {
		t.Errorf("UserName() = %s, want 田中 太郎", result.UserName())
	}
}

func TestGetUser_NotFound(t *testing.T) {
	repo := &mockUserRepo{
		getFunc: func(_ context.Context, userID string) (*domainuser.User, error) {
			return nil, nil
		},
	}
	uc := NewGetUserUseCase(repo)
	result, err := uc.GetUser(context.Background(), "20K23099")
	if err != nil {
		t.Fatalf("GetUser should not fail when user is not found: %v", err)
	}
	if result != nil {
		t.Error("GetUser should return nil when user is not found")
	}
}

func TestGetUser_EmptyUserID(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewGetUserUseCase(repo)
	if _, err := uc.GetUser(context.Background(), ""); err == nil {
		t.Error("GetUser with empty userID should fail")
	}
}

func TestGetUser_UserIDTooLong(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewGetUserUseCase(repo)
	if _, err := uc.GetUser(context.Background(), strings.Repeat("a", 21)); err == nil {
		t.Error("GetUser with userID > 20 chars should fail")
	}
}

func TestGetUser_ItemID(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewGetUserUseCase(repo)
	if _, err := uc.GetUser(context.Background(), "1"); err == nil {
		t.Error("GetUser with itemID should fail")
	}
}

func TestGetUser_RepoError(t *testing.T) {
	repo := &mockUserRepo{
		getFunc: func(_ context.Context, userID string) (*domainuser.User, error) {
			return nil, errors.New("db error")
		},
	}
	uc := NewGetUserUseCase(repo)
	if _, err := uc.GetUser(context.Background(), "20K23099"); err == nil {
		t.Error("GetUser should propagate repo error")
	}
}

// --- RegisterUser ---

func TestRegisterUser_Success(t *testing.T) {
	repo := &mockUserRepo{
		insertFunc: func(_ context.Context, u *domainuser.User) (*domainuser.User, error) {
			return u, nil
		},
	}
	uc := NewRegisterUserUseCase(repo)
	result, err := uc.RegisterUser(context.Background(), "20K23099", "田中 太郎")
	if err != nil {
		t.Fatalf("RegisterUser should succeed: %v", err)
	}
	if result.ID() != "20K23099" {
		t.Errorf("ID() = %s, want 20K23099", result.ID())
	}
	if result.UserName() != "田中 太郎" {
		t.Errorf("UserName() = %s, want 田中 太郎", result.UserName())
	}
}

func TestRegisterUser_EmptyUserID(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewRegisterUserUseCase(repo)
	if _, err := uc.RegisterUser(context.Background(), "", "田中 太郎"); err == nil {
		t.Error("RegisterUser with empty userID should fail")
	}
}

func TestRegisterUser_EmptyUserName(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewRegisterUserUseCase(repo)
	if _, err := uc.RegisterUser(context.Background(), "20K23099", ""); err == nil {
		t.Error("RegisterUser with empty userName should fail")
	}
}

func TestRegisterUser_UserIDTooLong(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewRegisterUserUseCase(repo)
	if _, err := uc.RegisterUser(context.Background(), strings.Repeat("a", 21), "田中 太郎"); err == nil {
		t.Error("RegisterUser with userID > 20 chars should fail")
	}
}

func TestRegisterUser_UserNameTooLong(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewRegisterUserUseCase(repo)
	if _, err := uc.RegisterUser(context.Background(), "20K23099", strings.Repeat("a", 51)); err == nil {
		t.Error("RegisterUser with userName > 50 chars should fail")
	}
}

func TestRegisterUser_RepoError(t *testing.T) {
	repo := &mockUserRepo{
		insertFunc: func(_ context.Context, u *domainuser.User) (*domainuser.User, error) {
			return nil, errors.New("db error")
		},
	}
	uc := NewRegisterUserUseCase(repo)
	if _, err := uc.RegisterUser(context.Background(), "20K23099", "田中 太郎"); err == nil {
		t.Error("RegisterUser should propagate repo error")
	}
}

func TestRegisterUser_AlreadyExists(t *testing.T) {
	repo := &mockUserRepo{
		insertFunc: func(_ context.Context, u *domainuser.User) (*domainuser.User, error) {
			return nil, domainuser.ErrUserAlreadyExists
		},
	}
	uc := NewRegisterUserUseCase(repo)
	_, err := uc.RegisterUser(context.Background(), "20K23099", "田中 太郎")
	if !errors.Is(err, domainuser.ErrUserAlreadyExists) {
		t.Errorf("RegisterUser should return ErrUserAlreadyExists, got: %v", err)
	}
}

func TestRegisterUser_MaxLengthUserID(t *testing.T) {
	repo := &mockUserRepo{
		insertFunc: func(_ context.Context, u *domainuser.User) (*domainuser.User, error) {
			return u, nil
		},
	}
	uc := NewRegisterUserUseCase(repo)
	id := "20K" + strings.Repeat("1", 17) // 20 chars in valid format
	if _, err := uc.RegisterUser(context.Background(), id, "田中 太郎"); err != nil {
		t.Errorf("RegisterUser with 20-char userID should succeed: %v", err)
	}
}

// --- UpdateUser ---

func TestUpdateUser_Success(t *testing.T) {
	repo := &mockUserRepo{
		updateFunc: func(_ context.Context, u *domainuser.User) (*domainuser.User, error) {
			return u, nil
		},
	}
	uc := NewUpdateUserUseCase(repo, &mockTx{})
	result, err := uc.UpdateUser(context.Background(), "20K23099", "", "佐藤 花子")
	if err != nil {
		t.Fatalf("UpdateUser should succeed: %v", err)
	}
	if result.ID() != "20K23099" {
		t.Errorf("ID() = %s, want 20K23099", result.ID())
	}
	if result.UserName() != "佐藤 花子" {
		t.Errorf("UserName() = %s, want 佐藤 花子", result.UserName())
	}
}

func TestUpdateUser_EmptyUserName(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewUpdateUserUseCase(repo, &mockTx{})
	if _, err := uc.UpdateUser(context.Background(), "20K23099", "", ""); err == nil {
		t.Error("UpdateUser with empty userName should fail")
	}
}

func TestUpdateUser_EmptyUserID(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewUpdateUserUseCase(repo, &mockTx{})
	if _, err := uc.UpdateUser(context.Background(), "", "", "田中 太郎"); err == nil {
		t.Error("UpdateUser with empty userID should fail")
	}
}

func TestUpdateUser_UserNameTooLong(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewUpdateUserUseCase(repo, &mockTx{})
	if _, err := uc.UpdateUser(context.Background(), "20K23099", "", strings.Repeat("a", 51)); err == nil {
		t.Error("UpdateUser with userName > 50 chars should fail")
	}
}

func TestUpdateUser_RepoError(t *testing.T) {
	repo := &mockUserRepo{
		updateFunc: func(_ context.Context, u *domainuser.User) (*domainuser.User, error) {
			return nil, errors.New("db error")
		},
	}
	uc := NewUpdateUserUseCase(repo, &mockTx{})
	if _, err := uc.UpdateUser(context.Background(), "20K23099", "", "田中 太郎"); err == nil {
		t.Error("UpdateUser should propagate repo error")
	}
}

func TestGetUser_Stopped(t *testing.T) {
	repo := &mockUserRepo{
		getFunc: func(context.Context, string) (*domainuser.User, error) { return nil, nil },
		stopped: true,
	}
	_, err := NewGetUserUseCase(repo).GetUser(context.Background(), "22K01234")
	if !errors.Is(err, domainuser.ErrUserStopped) {
		t.Fatalf("err = %v, want ErrUserStopped", err)
	}
}

func TestUpdateUser_ChangeUserID(t *testing.T) {
	var changed [2]string
	repo := &mockUserRepo{
		changeFunc: func(_ context.Context, oldID, newID string) error {
			changed = [2]string{oldID, newID}
			return nil
		},
		updateFunc: func(_ context.Context, u *domainuser.User) (*domainuser.User, error) { return u, nil },
	}
	tx := &mockTx{}
	result, err := NewUpdateUserUseCase(repo, tx).UpdateUser(context.Background(), "20K23099", "20K23098", "佐藤 花子")
	if err != nil {
		t.Fatal(err)
	}
	if changed != [2]string{"20K23099", "20K23098"} || !tx.called {
		t.Errorf("学籍番号の付け替えがトランザクションの中で呼ばれていない: %v %v", changed, tx.called)
	}
	if result.ID() != "20K23098" || result.UserName() != "佐藤 花子" {
		t.Errorf("result = %s %s", result.ID(), result.UserName())
	}
}

func TestUpdateUser_SameOrEmptyNewIDDoesNotChange(t *testing.T) {
	repo := &mockUserRepo{
		changeFunc: func(context.Context, string, string) error {
			t.Fatal("学籍番号が同じなのに付け替えた")
			return nil
		},
		updateFunc: func(_ context.Context, u *domainuser.User) (*domainuser.User, error) { return u, nil },
	}
	for _, id := range []string{"", "20K23099", " 20K23099 "} {
		if _, err := NewUpdateUserUseCase(repo, &mockTx{}).UpdateUser(context.Background(), "20K23099", id, "佐藤"); err != nil {
			t.Fatal(err)
		}
	}
}

func TestUpdateUser_ChangeUserIDErrors(t *testing.T) {
	// 新しい学籍番号の形が不正なら付け替えない
	repo := &mockUserRepo{changeFunc: func(context.Context, string, string) error {
		t.Fatal("形が不正なのに付け替えた")
		return nil
	}}
	if _, err := NewUpdateUserUseCase(repo, &mockTx{}).UpdateUser(context.Background(), "20K23099", "abc", "佐藤"); err == nil {
		t.Error("形が不正な学籍番号でエラーにならない")
	}
	// 使われている学籍番号は 409 になるエラーをそのまま返す
	repo = &mockUserRepo{changeFunc: func(context.Context, string, string) error { return domainuser.ErrUserAlreadyExists }}
	if _, err := NewUpdateUserUseCase(repo, &mockTx{}).UpdateUser(context.Background(), "20K23099", "20K23098", "佐藤"); !errors.Is(err, domainuser.ErrUserAlreadyExists) {
		t.Errorf("err = %v", err)
	}
}
