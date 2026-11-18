package paymentcard

import (
	"context"
	"errors"
	"testing"

	"sysken-pay-api/app/domain/derrors"
	domainpc "sysken-pay-api/app/domain/object/paymentcard"
)

// メモリ上の発行用 QR。期限は remaining（秒）で持つ
type memClaimRepo struct {
	claims  map[int64]*domainpc.Claim
	hashes  map[string]int64
	nextID  int64
	deleted int
}

func newMemClaimRepo() *memClaimRepo {
	return &memClaimRepo{claims: map[int64]*domainpc.Claim{}, hashes: map[string]int64{}}
}
func (m *memClaimRepo) InsertClaim(_ context.Context, userID, hash string, sealed []byte, ttl int) (int64, error) {
	m.nextID++
	m.claims[m.nextID] = &domainpc.Claim{ID: m.nextID, UserID: userID, SealedCode: sealed, RemainingSeconds: ttl}
	m.hashes[hash] = m.nextID
	return m.nextID, nil
}
func (m *memClaimRepo) FindClaimByTokenHash(_ context.Context, hash string) (*domainpc.Claim, error) {
	id, ok := m.hashes[hash]
	if !ok {
		return nil, nil
	}
	c := *m.claims[id]
	return &c, nil
}
func (m *memClaimRepo) FindClaimByID(_ context.Context, id int64) (*domainpc.Claim, error) {
	c, ok := m.claims[id]
	if !ok {
		return nil, nil
	}
	cp := *c
	cp.SealedCode = nil
	return &cp, nil
}
func (m *memClaimRepo) IncrementOpenCount(_ context.Context, id int64) error {
	m.claims[id].OpenCount++
	return nil
}
func (m *memClaimRepo) DeleteExpiredClaims(context.Context) error {
	for h, id := range m.hashes {
		if m.claims[id].RemainingSeconds <= 0 {
			delete(m.claims, id)
			delete(m.hashes, h)
			m.deleted++
		}
	}
	return nil
}

func setupClaim(t *testing.T) (*ClaimServiceImpl, *ResolveServiceImpl, *memCardRepo, *memClaimRepo) {
	t.Helper()
	_, resolve, cards := setup(t)
	claims := newMemClaimRepo()
	users := resolve.userRepo
	return NewClaimUseCase(users, cards, claims, &memTx{cards: cards}), resolve, cards, claims
}

func TestClaim_CreateOpenResolve(t *testing.T) {
	uc, resolve, _, claims := setupClaim(t)
	ctx := context.Background()

	created, err := uc.CreateClaim(ctx, "24K01234")
	if err != nil {
		t.Fatal(err)
	}
	if created.ExpiresIn != 300 || created.User.UserName() != "シス研太郎" {
		t.Errorf("created = %+v", created)
	}
	// DB にはトークンそのものが入っていない
	if _, ok := claims.hashes[created.Token]; ok {
		t.Error("トークンそのものが保存されている")
	}

	// スマホで開くと支払い用バーコードが分かり、それで照合できる
	opened, err := uc.Open(ctx, created.Token)
	if err != nil {
		t.Fatal(err)
	}
	if u, err := resolve.Resolve(ctx, opened.Code); err != nil || u.ID() != "24K01234" {
		t.Fatalf("開いたバーコードで照合できない: %v", err)
	}

	// 期限内なら何度でも開けて、同じバーコードが出る。開いた回数が数えられる
	again, err := uc.Open(ctx, created.Token)
	if err != nil || again.Code != opened.Code {
		t.Fatalf("2回目: %v, same=%v", err, again != nil && again.Code == opened.Code)
	}
	st, _ := uc.Status(ctx, created.ClaimID)
	if st.OpenCount != 2 || st.RemainingSeconds != 300 {
		t.Errorf("status = %+v", st)
	}
}

func TestClaim_CreateRevokesOldCard(t *testing.T) {
	uc, resolve, cards, _ := setupClaim(t)
	ctx := context.Background()

	first, _ := uc.CreateClaim(ctx, "24K01234")
	firstCode, _ := uc.Open(ctx, first.Token)
	if _, err := uc.CreateClaim(ctx, "24K01234"); err != nil {
		t.Fatal(err)
	}
	if n := cards.active("24K01234"); n != 1 {
		t.Errorf("使えるバーコードの数 = %d, want 1", n)
	}
	if _, err := resolve.Resolve(ctx, firstCode.Code); !errors.Is(err, ErrCardNotFound) {
		t.Errorf("作り直す前のバーコードで払えてしまう: %v", err)
	}
}

func TestClaim_Expired(t *testing.T) {
	uc, _, _, claims := setupClaim(t)
	ctx := context.Background()

	created, _ := uc.CreateClaim(ctx, "24K01234")
	claims.claims[created.ClaimID].RemainingSeconds = 0 // 5分たった

	if _, err := uc.Open(ctx, created.Token); !errors.Is(err, ErrClaimExpired) {
		t.Errorf("期限切れの QR で受け取れてしまう: %v", err)
	}
	st, _ := uc.Status(ctx, created.ClaimID)
	if st.RemainingSeconds != 0 {
		t.Errorf("残り時間 = %d", st.RemainingSeconds)
	}

	// 次に QR を作るとき、期限切れのものは消える
	if _, err := uc.CreateClaim(ctx, "24K05678"); err != nil {
		t.Fatal(err)
	}
	if claims.deleted != 1 {
		t.Errorf("期限切れの QR が消えていない: deleted=%d", claims.deleted)
	}
}

func TestClaim_OpenInvalidAndUnknown(t *testing.T) {
	uc, _, _, _ := setupClaim(t)
	ctx := context.Background()

	if _, err := uc.Open(ctx, "abc"); !errors.Is(err, derrors.ErrInvalidInput) {
		t.Errorf("形式が不正: %v", err)
	}
	tok, _ := domainpc.GenerateClaimToken()
	if _, err := uc.Open(ctx, tok); !errors.Is(err, ErrClaimNotFound) {
		t.Errorf("存在しない: %v", err)
	}
	if _, err := uc.Status(ctx, 999); !errors.Is(err, ErrClaimNotFound) {
		t.Errorf("存在しない ID: %v", err)
	}
}

func TestClaim_UnknownUser(t *testing.T) {
	uc, _, cards, claims := setupClaim(t)
	if _, err := uc.CreateClaim(context.Background(), "99Z99999"); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("err = %v", err)
	}
	if len(cards.rows) != 0 || len(claims.claims) != 0 {
		t.Error("登録されていない人に発行された")
	}
}

func TestClaim_FailureKeepsOldCard(t *testing.T) {
	uc, resolve, cards, _ := setupClaim(t)
	ctx := context.Background()

	first, _ := uc.CreateClaim(ctx, "24K01234")
	old, _ := uc.Open(ctx, first.Token)

	cards.insertErr = errors.New("db down")
	if _, err := uc.CreateClaim(ctx, "24K01234"); err == nil {
		t.Fatal("失敗したのにエラーにならない")
	}
	if u, err := resolve.Resolve(ctx, old.Code); err != nil || u.ID() != "24K01234" {
		t.Errorf("作り直しに失敗したら古いバーコードまで使えなくなった: %v", err)
	}
}
