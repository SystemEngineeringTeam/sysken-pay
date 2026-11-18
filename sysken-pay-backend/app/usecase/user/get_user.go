package user

import (
	"context"
	"errors"
	"fmt"
	domainuser "sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/domain/repository"
)

var ErrInvalidUserID = errors.New("invalid userID")

type GetUserUseCase interface {
	GetUser(ctx context.Context, userID string) (*domainuser.User, error)
}

type GetUserServiceImpl struct {
	userRepo repository.UserRepository
}

func NewGetUserUseCase(userRepo repository.UserRepository) *GetUserServiceImpl {
	return &GetUserServiceImpl{userRepo: userRepo}
}

func (s *GetUserServiceImpl) GetUser(ctx context.Context, userID string) (*domainuser.User, error) {
	if err := (&domainuser.User{}).SetUserID(userID); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidUserID, err)
	}
	u, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil || u != nil {
		return u, err
	}
	// 見つからないときは、利用停止している人か確かめる（画面で理由を出し分けるため）
	stopped, err := s.userRepo.IsStopped(ctx, userID)
	if err != nil {
		return nil, err
	}
	if stopped {
		return nil, fmt.Errorf("%w: userID=%s", domainuser.ErrUserStopped, userID)
	}
	return nil, nil
}
