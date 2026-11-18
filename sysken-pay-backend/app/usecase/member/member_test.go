package member

import (
	"context"
	"errors"
	"testing"

	"sysken-pay-api/app/domain/derrors"
	domainbalance "sysken-pay-api/app/domain/object/balance"
	domainmember "sysken-pay-api/app/domain/object/member"
)

// fakeDB は1人分の状態を持つ、テスト用の保存先
type fakeDB struct {
	found      bool
	status     domainmember.Status
	balance    int
	hasCard    bool
	refunds    []int
	locked     bool
	inTx       bool
	stopCall   int
	hidden     bool
	hasHistory bool
	deleted    bool
}

type fakeMemberRepo struct{ db *fakeDB }

func (r *fakeMemberRepo) ListMembers(context.Context) ([]*domainmember.Summary, error) {
	return []*domainmember.Summary{{UserID: "22K01234", Balance: r.db.balance}}, nil
}
func (r *fakeMemberRepo) LockMember(context.Context, string) (domainmember.Status, bool, error) {
	if !r.db.inTx {
		return "", false, errors.New("トランザクションの外でロックした")
	}
	r.db.locked = true
	return r.db.status, r.db.found, nil
}
func (r *fakeMemberRepo) Stop(context.Context, string) error {
	r.db.stopCall++
	r.db.status = domainmember.StatusStopped
	return nil
}
func (r *fakeMemberRepo) Resume(context.Context, string) error {
	r.db.status = domainmember.StatusActive
	r.db.hidden = false
	return nil
}
func (r *fakeMemberRepo) IsHidden(context.Context, string) (bool, error) { return r.db.hidden, nil }
func (r *fakeMemberRepo) Hide(context.Context, string) error {
	r.db.hidden = true
	return nil
}
func (r *fakeMemberRepo) Unhide(context.Context, string) error {
	r.db.hidden = false
	return nil
}
func (r *fakeMemberRepo) HasHistory(context.Context, string) (bool, error) {
	return r.db.hasHistory, nil
}
func (r *fakeMemberRepo) Delete(context.Context, string) error {
	if !r.db.locked {
		return errors.New("ロックせずに消した")
	}
	r.db.deleted = true
	return nil
}
func (r *fakeMemberRepo) InsertRefund(_ context.Context, _ string, amount int) error {
	if !r.db.locked {
		return errors.New("ロックせずに返金した")
	}
	r.db.refunds = append(r.db.refunds, amount)
	r.db.balance -= amount
	return nil
}

type fakeBalanceRepo struct{ db *fakeDB }

func (r *fakeBalanceRepo) GetBalance(_ context.Context, userID string) (*domainbalance.Balance, error) {
	return domainbalance.NewBalance(userID, r.db.balance)
}
func (r *fakeBalanceRepo) GetPurchaseHistories(context.Context, string, int, int) ([]*domainbalance.PurchaseHistory, int, int, error) {
	return nil, 0, 0, nil
}

type fakeCardRepo struct{ db *fakeDB }

func (r *fakeCardRepo) RevokeActiveByUserID(context.Context, string) error {
	r.db.hasCard = false
	return nil
}
func (r *fakeCardRepo) Insert(context.Context, string, string) error { return nil }
func (r *fakeCardRepo) FindRevokedUserIDByHash(context.Context, string) (string, error) {
	return "", nil
}
func (r *fakeCardRepo) FindActiveUserIDByHash(context.Context, string) (string, error) {
	return "", nil
}

type fakeTx struct{ db *fakeDB }

func (t *fakeTx) Do(ctx context.Context, f func(ctx context.Context) error) error {
	t.db.inTx = true
	defer func() { t.db.inTx = false; t.db.locked = false }()
	return f(ctx)
}

func newUC(db *fakeDB) *ServiceImpl {
	return NewUseCase(&fakeMemberRepo{db}, &fakeBalanceRepo{db}, &fakeCardRepo{db}, &fakeTx{db})
}

const uid = "22K01234"

func TestRefund(t *testing.T) {
	db := &fakeDB{found: true, status: domainmember.StatusActive, balance: 1230}
	got, err := newUC(db).Refund(context.Background(), uid)
	if err != nil {
		t.Fatal(err)
	}
	if got != 1230 || db.balance != 0 {
		t.Errorf("返金 %d・残高 %d（残高ちょうどを返して 0 になるはず）", got, db.balance)
	}
	if len(db.refunds) != 1 || db.refunds[0] != 1230 {
		t.Errorf("refunds = %v", db.refunds)
	}
}

func TestRefundStoppedUser(t *testing.T) {
	// 止めたあとに遅れて受け取りに来た人
	db := &fakeDB{found: true, status: domainmember.StatusStopped, balance: 500}
	if got, err := newUC(db).Refund(context.Background(), uid); err != nil || got != 500 {
		t.Fatalf("got %d, %v", got, err)
	}
}

func TestRefundErrors(t *testing.T) {
	if _, err := newUC(&fakeDB{found: true, balance: 0}).Refund(context.Background(), uid); !errors.Is(err, ErrNothingToRefund) {
		t.Errorf("残高0: %v", err)
	}
	if _, err := newUC(&fakeDB{found: false}).Refund(context.Background(), uid); !errors.Is(err, ErrUserNotFound) {
		t.Errorf("いない人: %v", err)
	}
	if _, err := newUC(&fakeDB{}).Refund(context.Background(), "abc"); !errors.Is(err, derrors.ErrInvalidInput) {
		t.Errorf("形式が不正: %v", err)
	}
}

func TestStop(t *testing.T) {
	db := &fakeDB{found: true, status: domainmember.StatusActive, balance: 800, hasCard: true}
	remaining, err := newUC(db).Stop(context.Background(), uid)
	if err != nil {
		t.Fatal(err)
	}
	if remaining != 800 {
		t.Errorf("残っている残高 = %d", remaining)
	}
	if db.status != domainmember.StatusStopped || db.hasCard {
		t.Errorf("止まっていない・バーコードが使えるまま: %+v", db)
	}
	// 止めても残高は残す（受け取りに来なかった卒業生）
	if db.balance != 800 || len(db.refunds) != 0 {
		t.Errorf("止めただけなのに残高が変わった: %+v", db)
	}
}

func TestStopErrors(t *testing.T) {
	db := &fakeDB{found: true, status: domainmember.StatusStopped}
	if _, err := newUC(db).Stop(context.Background(), uid); !errors.Is(err, ErrAlreadyStopped) {
		t.Errorf("止めた人をもう一度: %v", err)
	}
	if db.stopCall != 0 {
		t.Error("止めた人をもう一度止めた")
	}
	if _, err := newUC(&fakeDB{}).Stop(context.Background(), uid); !errors.Is(err, ErrUserNotFound) {
		t.Errorf("いない人: %v", err)
	}
}

func TestResume(t *testing.T) {
	db := &fakeDB{found: true, status: domainmember.StatusStopped}
	if err := newUC(db).Resume(context.Background(), uid); err != nil {
		t.Fatal(err)
	}
	if db.status != domainmember.StatusActive {
		t.Error("再開していない")
	}
	if err := newUC(&fakeDB{found: true, status: domainmember.StatusActive}).Resume(context.Background(), uid); !errors.Is(err, ErrNotStopped) {
		t.Errorf("使える人を再開: %v", err)
	}
}

func TestHide(t *testing.T) {
	db := &fakeDB{found: true, status: domainmember.StatusStopped, balance: 0, hasHistory: true}
	if err := newUC(db).Hide(context.Background(), uid); err != nil {
		t.Fatal(err)
	}
	if !db.hidden || db.deleted {
		t.Errorf("非表示になっていない・消してしまった: %+v", db)
	}
}

func TestHideErrors(t *testing.T) {
	ctx := context.Background()
	if err := newUC(&fakeDB{found: true, status: domainmember.StatusActive}).Hide(ctx, uid); !errors.Is(err, ErrNotStopped) {
		t.Errorf("使える人は非表示にできない: %v", err)
	}
	// 未返金の人が一覧から見えなくならないように
	db := &fakeDB{found: true, status: domainmember.StatusStopped, balance: 500}
	if err := newUC(db).Hide(ctx, uid); !errors.Is(err, ErrBalanceRemaining) || db.hidden {
		t.Errorf("残高がある人: err=%v hidden=%v", err, db.hidden)
	}
	if err := newUC(&fakeDB{found: true, status: domainmember.StatusStopped, hidden: true}).Hide(ctx, uid); !errors.Is(err, ErrAlreadyHidden) {
		t.Errorf("すでに非表示: %v", err)
	}
	if err := newUC(&fakeDB{found: false}).Hide(ctx, uid); !errors.Is(err, ErrUserNotFound) {
		t.Errorf("いない人: %v", err)
	}
	if err := newUC(&fakeDB{}).Hide(ctx, "abc"); !errors.Is(err, derrors.ErrInvalidInput) {
		t.Errorf("形式が不正: %v", err)
	}
}

func TestUnhide(t *testing.T) {
	ctx := context.Background()
	db := &fakeDB{found: true, status: domainmember.StatusStopped, hidden: true}
	if err := newUC(db).Unhide(ctx, uid); err != nil || db.hidden {
		t.Fatalf("err=%v hidden=%v", err, db.hidden)
	}
	if err := newUC(&fakeDB{found: true, status: domainmember.StatusStopped}).Unhide(ctx, uid); !errors.Is(err, ErrNotHidden) {
		t.Errorf("非表示ではない: %v", err)
	}
}

func TestResumeUnhides(t *testing.T) {
	db := &fakeDB{found: true, status: domainmember.StatusStopped, hidden: true}
	if err := newUC(db).Resume(context.Background(), uid); err != nil || db.hidden {
		t.Errorf("再開で非表示も解けるはず: err=%v hidden=%v", err, db.hidden)
	}
}

func TestDelete(t *testing.T) {
	db := &fakeDB{found: true, status: domainmember.StatusStopped}
	if err := newUC(db).Delete(context.Background(), uid); err != nil || !db.deleted {
		t.Fatalf("err=%v deleted=%v", err, db.deleted)
	}
}

func TestDeleteErrors(t *testing.T) {
	ctx := context.Background()
	// 使える人は消せない（先に利用停止する）
	db := &fakeDB{found: true, status: domainmember.StatusActive}
	if err := newUC(db).Delete(ctx, uid); !errors.Is(err, ErrNotStopped) || db.deleted {
		t.Errorf("使える人: err=%v deleted=%v", err, db.deleted)
	}
	// 記録が1件でもある人は、残高 0 でも消さない
	db = &fakeDB{found: true, status: domainmember.StatusStopped, hasHistory: true}
	if err := newUC(db).Delete(ctx, uid); !errors.Is(err, ErrHasHistory) || db.deleted {
		t.Errorf("記録がある人: err=%v deleted=%v", err, db.deleted)
	}
	if err := newUC(&fakeDB{found: false}).Delete(ctx, uid); !errors.Is(err, ErrUserNotFound) {
		t.Errorf("いない人: %v", err)
	}
	if err := newUC(&fakeDB{}).Delete(ctx, "abc"); !errors.Is(err, derrors.ErrInvalidInput) {
		t.Errorf("形式が不正: %v", err)
	}
}
