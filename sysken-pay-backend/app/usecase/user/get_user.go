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
	return s.userRepo.GetUserByID(ctx, userID)
}
