package charge

import (
	"context"
	"errors"
	"testing"

	domaincharge "sysken-pay-api/app/domain/object/charge"
	domainmember "sysken-pay-api/app/domain/object/member"
)

// --- mock ---

type mockChargeRepo struct {
	chargeAmountFunc func(ctx context.Context, c *domaincharge.Charge) (*domaincharge.Charge, error)
}

func (m *mockChargeRepo) ChargeAmount(ctx context.Context, c *domaincharge.Charge) (*domaincharge.Charge, error) {
	return m.chargeAmountFunc(ctx, c)
}

type mockMemberRepo struct {
	status domainmember.Status
	found  bool
}

func (m *mockMemberRepo) ListMembers(context.Context) ([]*domainmember.Summary, error) {
	return nil, nil
}
func (m *mockMemberRepo) LockMember(context.Context, string) (domainmember.Status, bool, error) {
	return m.status, m.found, nil
}
func (m *mockMemberRepo) Stop(context.Context, string) error               { return nil }
func (m *mockMemberRepo) Resume(context.Context, string) error             { return nil }
func (m *mockMemberRepo) InsertRefund(context.Context, string, int) error  { return nil }
func (m *mockMemberRepo) IsHidden(context.Context, string) (bool, error)   { return false, nil }
func (m *mockMemberRepo) Hide(context.Context, string) error               { return nil }
func (m *mockMemberRepo) Unhide(context.Context, string) error             { return nil }
func (m *mockMemberRepo) HasHistory(context.Context, string) (bool, error) { return false, nil }
func (m *mockMemberRepo) Delete(context.Context, string) error             { return nil }

func activeMember() *mockMemberRepo {
	return &mockMemberRepo{status: domainmember.StatusActive, found: true}
}

// --- ChargeAmount ---

func TestChargeAmount_Success(t *testing.T) {
	repo := &mockChargeRepo{
		chargeAmountFunc: func(_ context.Context, c *domaincharge.Charge) (*domaincharge.Charge, error) {
			c.SetBalance(1500)
			return c, nil
		},
	}
	uc := NewChargeAmountUseCase(repo, activeMember(), passTx{})
	result, err := uc.ChargeAmount(context.Background(), "user-1", 1000)
	if err != nil {
		t.Fatalf("ChargeAmount should succeed: %v", err)
	}
	if result.Balance() != 1500 {
		t.Errorf("Balance() = %d, want 1500", result.Balance())
	}
}

func TestChargeAmount_InvalidAmount(t *testing.T) {
	repo := &mockChargeRepo{}
	uc := NewChargeAmountUseCase(repo, activeMember(), passTx{})
	if _, err := uc.ChargeAmount(context.Background(), "user-1", 300); err == nil {
		t.Error("ChargeAmount with invalid amount should fail")
	}
}

func TestChargeAmount_EmptyUserID(t *testing.T) {
	repo := &mockChargeRepo{}
	uc := NewChargeAmountUseCase(repo, activeMember(), passTx{})
	if _, err := uc.ChargeAmount(context.Background(), "", 1000); err == nil {
		t.Error("ChargeAmount with empty userID should fail")
	}
}

func TestChargeAmount_RepoError(t *testing.T) {
	repo := &mockChargeRepo{
		chargeAmountFunc: func(_ context.Context, c *domaincharge.Charge) (*domaincharge.Charge, error) {
			return nil, errors.New("db error")
		},
	}
	uc := NewChargeAmountUseCase(repo, activeMember(), passTx{})
	if _, err := uc.ChargeAmount(context.Background(), "user-1", 1000); err == nil {
		t.Error("ChargeAmount should propagate repo error")
	}
}

func TestChargeAmount_AllAllowedAmounts(t *testing.T) {
	for _, amount := range []int{500, 1000, 2000} {
		repo := &mockChargeRepo{
			chargeAmountFunc: func(_ context.Context, c *domaincharge.Charge) (*domaincharge.Charge, error) {
				return c, nil
			},
		}
		uc := NewChargeAmountUseCase(repo, activeMember(), passTx{})
		if _, err := uc.ChargeAmount(context.Background(), "user-1", amount); err != nil {
			t.Errorf("ChargeAmount(%d) should succeed: %v", amount, err)
		}
	}
}

func TestChargeAmount_StoppedOrMissingUser(t *testing.T) {
	called := false
	repo := &mockChargeRepo{
		chargeAmountFunc: func(_ context.Context, c *domaincharge.Charge) (*domaincharge.Charge, error) {
			called = true
			return c, nil
		},
	}
	for name, tc := range map[string]struct {
		m    *mockMemberRepo
		want error
	}{
		"利用停止した人": {&mockMemberRepo{status: domainmember.StatusStopped, found: true}, ErrUserStopped},
		"いない人":    {&mockMemberRepo{found: false}, ErrUserNotFound},
	} {
		m := tc.m
		if _, err := NewChargeAmountUseCase(repo, m, passTx{}).ChargeAmount(context.Background(), "22K01234", 1000); !errors.Is(err, tc.want) {
			t.Errorf("%s: err = %v", name, err)
		}
	}
	if called {
		t.Error("利用停止した人・いない人にチャージした")
	}
}

// --- トランザクション（issue #75） ---

// passTx は f をそのまま実行するだけのトランザクション。
type passTx struct{}

func (passTx) Do(ctx context.Context, f func(context.Context) error) error { return f(ctx) }

// recordTx は Do の中にいるかどうかと、f が返したエラー（= ロールバックされる）を記録する。
type recordTx struct {
	inside     bool
	called     int
	rolledBack bool
}

func (r *recordTx) Do(ctx context.Context, f func(context.Context) error) error {
	r.called++
	r.inside = true
	defer func() { r.inside = false }()
	err := f(ctx)
	r.rolledBack = err != nil
	return err
}

// lockCheckMemberRepo は LockMember がトランザクションの中で呼ばれたかを記録する。
type lockCheckMemberRepo struct {
	mockMemberRepo
	tx           *recordTx
	lockedInside bool
}

func (m *lockCheckMemberRepo) LockMember(ctx context.Context, id string) (domainmember.Status, bool, error) {
	m.lockedInside = m.tx.inside
	return m.mockMemberRepo.LockMember(ctx, id)
}

// ロック（LockMember）とチャージの INSERT が、同じトランザクションの中で行われること。
// 外で走ると SELECT ... FOR UPDATE のロックがすぐ外れ、利用停止・返金と同時に走ったときに守られない
func TestChargeAmount_LockAndChargeRunInsideTransaction(t *testing.T) {
	tx := &recordTx{}
	members := &lockCheckMemberRepo{mockMemberRepo: *activeMember(), tx: tx}
	chargedInside := false
	repo := &mockChargeRepo{
		chargeAmountFunc: func(_ context.Context, c *domaincharge.Charge) (*domaincharge.Charge, error) {
			chargedInside = tx.inside
			return c, nil
		},
	}
	if _, err := NewChargeAmountUseCase(repo, members, tx).ChargeAmount(context.Background(), "user-1", 1000); err != nil {
		t.Fatal(err)
	}
	if tx.called != 1 {
		t.Errorf("txManager.Do の呼び出し回数 = %d, want 1", tx.called)
	}
	if !members.lockedInside {
		t.Error("LockMember がトランザクションの外で呼ばれた")
	}
	if !chargedInside {
		t.Error("チャージの INSERT がトランザクションの外で呼ばれた")
	}
}

// チャージの途中で失敗したら、エラーがそのまま返り、ロールバックされること。
func TestChargeAmount_RepoErrorRollsBack(t *testing.T) {
	tx := &recordTx{}
	repo := &mockChargeRepo{
		chargeAmountFunc: func(context.Context, *domaincharge.Charge) (*domaincharge.Charge, error) {
			return nil, errors.New("balance insert failed")
		},
	}
	if _, err := NewChargeAmountUseCase(repo, activeMember(), tx).ChargeAmount(context.Background(), "user-1", 1000); err == nil {
		t.Fatal("エラーが返るはず")
	}
	if !tx.rolledBack {
		t.Error("失敗したのにロールバックされていない")
	}
}

// 利用停止した人には、トランザクションの中で断られ、チャージの INSERT まで進まないこと。
func TestChargeAmount_StoppedUserRollsBackBeforeInsert(t *testing.T) {
	tx := &recordTx{}
	called := false
	repo := &mockChargeRepo{
		chargeAmountFunc: func(_ context.Context, c *domaincharge.Charge) (*domaincharge.Charge, error) {
			called = true
			return c, nil
		},
	}
	m := &mockMemberRepo{status: domainmember.StatusStopped, found: true}
	if _, err := NewChargeAmountUseCase(repo, m, tx).ChargeAmount(context.Background(), "user-1", 500); !errors.Is(err, ErrUserStopped) {
		t.Fatalf("err = %v, want ErrUserStopped", err)
	}
	if called || !tx.rolledBack {
		t.Errorf("called=%v rolledBack=%v", called, tx.rolledBack)
	}
}

// 負の金額・0 円・許可されていない金額は、トランザクションを始める前に断ること。
func TestChargeAmount_InvalidAmountsNeverStartTransaction(t *testing.T) {
	for _, amount := range []int{-1000, -1, 0, 1, 999} {
		tx := &recordTx{}
		if _, err := NewChargeAmountUseCase(&mockChargeRepo{}, activeMember(), tx).ChargeAmount(context.Background(), "user-1", amount); err == nil {
			t.Errorf("amount=%d: エラーになるはず", amount)
		}
		if tx.called != 0 {
			t.Errorf("amount=%d: 不正な金額なのにトランザクションを始めた", amount)
		}
	}
}
