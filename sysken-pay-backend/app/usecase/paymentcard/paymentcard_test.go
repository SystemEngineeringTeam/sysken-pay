package paymentcard

import (
	"context"
	"errors"
	"testing"
	"time"

	"sysken-pay-api/app/domain/derrors"
	domainpc "sysken-pay-api/app/domain/object/paymentcard"
	domainuser "sysken-pay-api/app/domain/object/user"
)

// --- テスト用のリポジトリ（メモリ上） ---

type memUserRepo struct {
	users   map[string]*domainuser.User
	stopped map[string]bool
}

func (m *memUserRepo) IsStopped(_ context.Context, id string) (bool, error) {
	return m.stopped[id], nil
}

func (m *memUserRepo) GetUserByID(_ context.Context, id string) (*domainuser.User, error) {
	return m.users[id], nil
}
func (m *memUserRepo) InsertUser(context.Context, *domainuser.User) (*domainuser.User, error) {
	return nil, nil
}
func (m *memUserRepo) UpdateUser(context.Context, *domainuser.User) (*domainuser.User, error) {
	return nil, nil
}

type cardRow struct {
	userID  string
	hash    string
	revoked bool
}

type memCardRepo struct {
	rows      []*cardRow
	insertErr error
}

func (m *memCardRepo) RevokeActiveByUserID(_ context.Context, userID string) error {
	for _, r := range m.rows {
		if r.userID == userID {
			r.revoked = true
		}
	}
	return nil
}
func (m *memCardRepo) Insert(_ context.Context, userID, hash string) error {
	if m.insertErr != nil {
		return m.insertErr
	}
	m.rows = append(m.rows, &cardRow{userID: userID, hash: hash})
	return nil
}
func (m *memCardRepo) FindActiveUserIDByHash(_ context.Context, hash string) (string, error) {
	for _, r := range m.rows {
		if r.hash == hash && !r.revoked {
			return r.userID, nil
		}
	}
	return "", nil
}
func (m *memCardRepo) active(userID string) int {
	n := 0
	for _, r := range m.rows {
		if r.userID == userID && !r.revoked {
			n++
		}
	}
	return n
}

// 本物と同じく、f が失敗したら変更を取り消すトランザクション
type memTx struct{ cards *memCardRepo }

func (t *memTx) Do(ctx context.Context, f func(ctx context.Context) error) error {
	snapshot := make([]*cardRow, len(t.cards.rows))
	for i, r := range t.cards.rows {
		c := *r
		snapshot[i] = &c
	}
	if err := f(ctx); err != nil {
		t.cards.rows = snapshot
		return err
	}
	return nil
}

func newUser(t *testing.T, id, name string) *domainuser.User {
	t.Helper()
	u, err := domainuser.NewUserFromDB(id, name, time.Now().Add(-time.Hour), time.Now().Add(-time.Hour), time.Time{})
	if err != nil {
		t.Fatal(err)
	}
	return u
}

func setup(t *testing.T) (*IssueServiceImpl, *ResolveServiceImpl, *memCardRepo) {
	t.Helper()
	users := &memUserRepo{users: map[string]*domainuser.User{
		"24K01234": newUser(t, "24K01234", "シス研太郎"),
		"24K05678": newUser(t, "24K05678", "シス研花子"),
	}}
	cards := &memCardRepo{}
	return NewIssueUseCase(users, cards, &memTx{cards: cards}), NewResolveUseCase(users, cards), cards
}

// --- 発行 ---

func TestIssue_ThenResolve(t *testing.T) {
	issue, resolve, cards := setup(t)

	got, err := issue.Issue(context.Background(), "24K01234")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := domainpc.NormalizeCode(got.Code); err != nil {
		t.Fatalf("発行した文字列の形式が正しくない: %s", got.Code)
	}
	if got.User.UserName() != "シス研太郎" {
		t.Errorf("名前 = %q", got.User.UserName())
	}

	// DB にはハッシュだけが入っている
	if cards.rows[0].hash == got.Code || cards.rows[0].hash != domainpc.HashCode(got.Code) {
		t.Error("DB に文字列そのものが保存されている、またはハッシュが違う")
	}

	u, err := resolve.Resolve(context.Background(), got.Code)
	if err != nil {
		t.Fatal(err)
	}
	if u.ID() != "24K01234" {
		t.Errorf("持ち主 = %s, want 24K01234", u.ID())
	}

	// 4文字ずつ区切った表示・小文字でも照合できる（Wallet に手で入れた人のため）
	if u, err := resolve.Resolve(context.Background(), domainpc.DisplayCode(got.Code)); err != nil || u.ID() != "24K01234" {
		t.Errorf("区切った表示で照合できない: %v", err)
	}
}

func TestIssue_ReissueRevokesOld(t *testing.T) {
	issue, resolve, cards := setup(t)
	ctx := context.Background()

	first, err := issue.Issue(ctx, "24K01234")
	if err != nil {
		t.Fatal(err)
	}
	second, err := issue.Issue(ctx, "24K01234")
	if err != nil {
		t.Fatal(err)
	}

	if first.Code == second.Code {
		t.Fatal("作り直しで同じ文字列になった")
	}
	if n := cards.active("24K01234"); n != 1 {
		t.Errorf("使えるバーコードの数 = %d, want 1", n)
	}
	if _, err := resolve.Resolve(ctx, first.Code); !errors.Is(err, ErrCardNotFound) {
		t.Errorf("作り直す前のバーコードで払えてしまう: %v", err)
	}
	if u, err := resolve.Resolve(ctx, second.Code); err != nil || u.ID() != "24K01234" {
		t.Errorf("新しいバーコードで照合できない: %v", err)
	}
}

func TestIssue_DoesNotAffectOtherUsers(t *testing.T) {
	issue, resolve, _ := setup(t)
	ctx := context.Background()

	taro, _ := issue.Issue(ctx, "24K01234")
	if _, err := issue.Issue(ctx, "24K05678"); err != nil {
		t.Fatal(err)
	}
	if u, err := resolve.Resolve(ctx, taro.Code); err != nil || u.ID() != "24K01234" {
		t.Errorf("他の人の発行で使えなくなった: %v", err)
	}
}

func TestIssue_UnknownUser(t *testing.T) {
	issue, _, cards := setup(t)
	_, err := issue.Issue(context.Background(), "99Z99999")
	if !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("err = %v, want ErrUserNotFound", err)
	}
	if len(cards.rows) != 0 {
		t.Error("登録されていない人に発行された")
	}
}

func TestIssue_InvalidUserID(t *testing.T) {
	issue, _, _ := setup(t)
	_, err := issue.Issue(context.Background(), "abc")
	if !errors.Is(err, derrors.ErrInvalidInput) {
		t.Fatalf("err = %v, want 入力不正", err)
	}
}

func TestIssue_FailureKeepsOldCard(t *testing.T) {
	issue, resolve, cards := setup(t)
	ctx := context.Background()

	old, _ := issue.Issue(ctx, "24K01234")
	cards.insertErr = errors.New("db down")
	if _, err := issue.Issue(ctx, "24K01234"); err == nil {
		t.Fatal("保存に失敗したのにエラーにならない")
	}
	// 途中で失敗したら、古いバーコードは使えるまま（使えるものが0個にならない）
	if u, err := resolve.Resolve(ctx, old.Code); err != nil || u.ID() != "24K01234" {
		t.Errorf("作り直しに失敗したら古いバーコードまで使えなくなった: %v", err)
	}
}

// --- 照合 ---

func TestResolve_InvalidFormat(t *testing.T) {
	_, resolve, _ := setup(t)
	for _, code := range []string{"24K01234", "4901234567894", "", "SP0000"} {
		if _, err := resolve.Resolve(context.Background(), code); !errors.Is(err, derrors.ErrInvalidInput) {
			t.Errorf("%q: err = %v, want 入力不正", code, err)
		}
	}
}

func TestResolve_UnknownCode(t *testing.T) {
	_, resolve, _ := setup(t)
	code, _ := domainpc.GenerateCode()
	if _, err := resolve.Resolve(context.Background(), code); !errors.Is(err, ErrCardNotFound) {
		t.Errorf("err = %v, want ErrCardNotFound", err)
	}
}

func TestIssue_StoppedUser(t *testing.T) {
	users := &memUserRepo{users: map[string]*domainuser.User{}, stopped: map[string]bool{"22K01234": true}}
	cards := &memCardRepo{}
	issue := NewIssueUseCase(users, cards, &memTx{cards: cards})
	_, err := issue.Issue(context.Background(), "22K01234")
	if !errors.Is(err, domainuser.ErrUserStopped) {
		t.Fatalf("err = %v, want ErrUserStopped（先に「利用を再開」してもらう）", err)
	}
	if len(cards.rows) != 0 {
		t.Error("利用停止した人に発行された")
	}
}
