package purchase

import (
	"context"
	"errors"
	"fmt"
	domainmember "sysken-pay-api/app/domain/object/member"
	"sysken-pay-api/app/domain/object/purchase"
	domainuser "sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/domain/repository"
	domainservice "sysken-pay-api/app/domain/service/purchase"
)

// ErrItemNotFound は購入対象の商品が存在しない場合に返されます（ハンドラ側で404にマッピングされる）。
var ErrItemNotFound = errors.New("item not found")

// ErrUserNotFound はユーザーがいない場合に返されます（ハンドラ側で404にマッピングされる）。
var ErrUserNotFound = errors.New("user not found")

// ErrUserStopped はユーザーが利用停止している場合に返されます（ハンドラ側で403にマッピングされる）。
var ErrUserStopped = domainuser.ErrUserStopped

// ErrInsufficientBalance は残高不足の場合に返されます（ハンドラ側で400にマッピングされる）。
// ハンドラが domain 層を直接参照しなくて済むように、ここから公開する。
var ErrInsufficientBalance = domainservice.ErrInsufficientBalance

type CreatePurchaseUseCase interface {
	CreatePurchase(ctx context.Context, userID string, inputs []PurchaseItemInput) (*purchase.Purchase, error)
}

type CreatePurchaseServiceImpl struct {
	purchaseCreateRepo repository.PurchaseRepository
	itemRepo           repository.ItemRepository
	balanceRepo        repository.BalanceRepository
	memberRepo         repository.MemberRepository
	txManager          repository.Transaction
}

func NewCreatePurchaseUseCase(
	purchaseCreateRepo repository.PurchaseRepository,
	itemRepo repository.ItemRepository,
	balanceRepo repository.BalanceRepository,
	memberRepo repository.MemberRepository,
	txManager repository.Transaction,
) *CreatePurchaseServiceImpl {
	return &CreatePurchaseServiceImpl{
		purchaseCreateRepo: purchaseCreateRepo,
		itemRepo:           itemRepo,
		balanceRepo:        balanceRepo,
		memberRepo:         memberRepo,
		txManager:          txManager,
	}
}

func (s *CreatePurchaseServiceImpl) CreatePurchase(
	ctx context.Context, userID string, inputs []PurchaseItemInput) (*purchase.Purchase, error) {

	// ドメインオブジェクト生成 & 合計金額の算出
	items := make([]purchase.PurchaseItem, len(inputs))
	var totalAmount int
	for i, input := range inputs {
		pi, err := purchase.NewPurchaseItem(input.ItemID, input.Quantity)
		if err != nil {
			return nil, err
		}
		items[i] = pi

		it, err := s.itemRepo.GetItemByID(ctx, input.ItemID)
		if err != nil {
			return nil, err
		}
		// 無効の商品は買えない（リポジトリも返さないが、ここでも止める）
		if it == nil || it.Disabled() {
			return nil, fmt.Errorf("%w: itemID=%d", ErrItemNotFound, input.ItemID)
		}
		totalAmount += it.Price() * input.Quantity
	}

	p, err := purchase.NewPurchase(userID, items)
	if err != nil {
		return nil, err
	}

	var createdPurchase *purchase.Purchase
	err = s.txManager.Do(ctx, func(ctx context.Context) error {
		// ユーザーの行をロックしてから残高を見る（返金・利用停止と同時に走っても、額がずれないように）。
		// 利用停止した人は買えない
		status, found, err := s.memberRepo.LockMember(ctx, userID)
		if err != nil {
			return err
		}
		if !found {
			return fmt.Errorf("%w: userID=%s", ErrUserNotFound, userID)
		}
		if status == domainmember.StatusStopped {
			return fmt.Errorf("%w: userID=%s", ErrUserStopped, userID)
		}

		// トランザクション内で残高チェック（同時実行安全）
		b, err := s.balanceRepo.GetBalance(ctx, userID)
		if err != nil {
			return err
		}
		if err := domainservice.CanPurchase(b.Balance(), totalAmount); err != nil {
			return err
		}

		createdPurchase, err = s.purchaseCreateRepo.CreatePurchase(ctx, p)
		return err
	})
	if err != nil {
		return nil, err
	}

	return createdPurchase, nil
}
