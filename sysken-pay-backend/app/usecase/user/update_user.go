package user

import (
	"context"
	"log"
	"strings"
	"sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/domain/repository"
)

type UpdateUserUseCase interface {
	// UpdateUser は名前を変える。newUserID が空でなく今の学籍番号と違えば、学籍番号も変える
	UpdateUser(ctx context.Context, userId string, newUserID string, userName string) (*user.User, error)
}

type UpdateUserServiceImpl struct {
	userUpdateRepo repository.UserRepository
	tx             repository.Transaction
}

func NewUpdateUserUseCase(
	userUpdateRepo repository.UserRepository,
	tx repository.Transaction,
) *UpdateUserServiceImpl {
	return &UpdateUserServiceImpl{
		userUpdateRepo: userUpdateRepo,
		tx:             tx,
	}
}

func (s *UpdateUserServiceImpl) UpdateUser(
	ctx context.Context, userId string, newUserID string, userName string) (*user.User, error) {

	// ドメインオブジェクトの生成
	u, err := user.UpdateUser(userName)
	if err != nil {
		log.Printf("Failed to create user object: %v", err)
		return nil, err
	}
	// IDをセット（UpdateUserファクトリでは設定されないため）
	if err := u.SetUserID(userId); err != nil {
		log.Printf("Failed to set user id: %v", err)
		return nil, err
	}

	newUserID = strings.TrimSpace(newUserID)
	if newUserID == "" || newUserID == userId {
		updatedUser, err := s.userUpdateRepo.UpdateUser(ctx, u)
		if err != nil {
			log.Printf("Failed to update user: %v", err)
			return nil, err
		}
		return updatedUser, nil
	}

	// 学籍番号も変える。新しい学籍番号の形を先に確かめる（不正なら 400）
	if err := u.SetUserID(newUserID); err != nil {
		return nil, err
	}
	var updatedUser *user.User
	err = s.tx.Do(ctx, func(ctx context.Context) error {
		if err := s.userUpdateRepo.ChangeUserID(ctx, userId, newUserID); err != nil {
			return err
		}
		var err error
		updatedUser, err = s.userUpdateRepo.UpdateUser(ctx, u)
		return err
	})
	if err != nil {
		log.Printf("Failed to change user id: %v", err)
		return nil, err
	}
	return updatedUser, nil
}
