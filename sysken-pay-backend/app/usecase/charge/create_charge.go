package charge

import (
	"context"
	"errors"
	"fmt"
	"sysken-pay-api/app/domain/object/charge"
	domainmember "sysken-pay-api/app/domain/object/member"
	domainuser "sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/domain/repository"
)

// ErrUserNotFound はユーザーがいない場合に返されます（ハンドラ側で404にマッピングされる）。
var ErrUserNotFound = errors.New("user not found")

// ErrUserStopped はユーザーが利用停止している場合に返されます（ハンドラ側で403にマッピングされる）。
var ErrUserStopped = domainuser.ErrUserStopped

type ChargeAmountUseCase interface {
	ChargeAmount(ctx context.Context, userID string, amount int) (*charge.Charge, error)
}

type ChargeAmountServiceImpl struct {
	chargeAmountRepo repository.ChargeRepository
	memberRepo       repository.MemberRepository
	txManager        repository.Transaction
}

func NewChargeAmountUseCase(
	chargeAmountRepo repository.ChargeRepository,
	memberRepo repository.MemberRepository,
	txManager repository.Transaction,
) *ChargeAmountServiceImpl {
	return &ChargeAmountServiceImpl{
		chargeAmountRepo: chargeAmountRepo,
		memberRepo:       memberRepo,
		txManager:        txManager,
	}
}

func (s *ChargeAmountServiceImpl) ChargeAmount(
	ctx context.Context, userID string, amount int) (*charge.Charge, error) {

	c, err := charge.NewCharge(userID, amount)
	if err != nil {
		return nil, err
	}

	// ロック → charge の INSERT → balance の INSERT → 残高の集計 を 1 つのトランザクションで行う。
	// どこかで失敗したらすべてロールバックされ、charge だけ残ることはない。
	// LockMember の FOR UPDATE も、コミットまでロックを持ち続ける（利用停止・返金と同時に走っても守られる）
	var charged *charge.Charge
	err = s.txManager.Do(ctx, func(ctx context.Context) error {
		// 利用停止した人・いない人にはチャージしない
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

		charged, err = s.chargeAmountRepo.ChargeAmount(ctx, c)
		return err
	})
	if err != nil {
		return nil, err
	}

	return charged, nil
}
