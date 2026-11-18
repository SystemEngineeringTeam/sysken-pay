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
}

func NewChargeAmountUseCase(
	chargeAmountRepo repository.ChargeRepository,
	memberRepo repository.MemberRepository,
) *ChargeAmountServiceImpl {
	return &ChargeAmountServiceImpl{
		chargeAmountRepo: chargeAmountRepo,
		memberRepo:       memberRepo,
	}
}

func (s *ChargeAmountServiceImpl) ChargeAmount(
	ctx context.Context, userID string, amount int) (*charge.Charge, error) {

	c, err := charge.NewCharge(userID, amount)
	if err != nil {
		return nil, err
	}

	// 利用停止した人・いない人にはチャージしない
	status, found, err := s.memberRepo.LockMember(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, fmt.Errorf("%w: userID=%s", ErrUserNotFound, userID)
	}
	if status == domainmember.StatusStopped {
		return nil, fmt.Errorf("%w: userID=%s", ErrUserStopped, userID)
	}

	chargedAmount, err := s.chargeAmountRepo.ChargeAmount(ctx, c)
	if err != nil {
		return nil, err
	}

	return chargedAmount, nil
}
