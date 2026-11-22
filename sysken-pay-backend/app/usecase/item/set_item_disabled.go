package item

import (
	"context"
	"errors"
	"fmt"
	"sysken-pay-api/app/domain/object/item"
	"sysken-pay-api/app/domain/repository"
)

var (
	// ErrItemNotFound は商品が登録されていない（404）
	ErrItemNotFound = errors.New("item not found")
	// ErrAlreadyDisabled はすでに無効になっている（409）
	ErrAlreadyDisabled = errors.New("item already disabled")
	// ErrNotDisabled は無効になっていないので有効にできない（409）
	ErrNotDisabled = errors.New("item not disabled")
)

// SetItemDisabledUseCase は商品を無効にする／有効に戻す。商品は消さないので、いつでも戻せる
type SetItemDisabledUseCase interface {
	Disable(ctx context.Context, janCode string) error
	Enable(ctx context.Context, janCode string) error
}

type SetItemDisabledServiceImpl struct {
	repo repository.ItemRepository
}

func NewSetItemDisabledUseCase(repo repository.ItemRepository) *SetItemDisabledServiceImpl {
	return &SetItemDisabledServiceImpl{repo: repo}
}

func (s *SetItemDisabledServiceImpl) Disable(ctx context.Context, janCode string) error {
	return s.set(ctx, janCode, true)
}

func (s *SetItemDisabledServiceImpl) Enable(ctx context.Context, janCode string) error {
	return s.set(ctx, janCode, false)
}

func (s *SetItemDisabledServiceImpl) set(ctx context.Context, janCode string, disabled bool) error {
	if err := (&item.Item{}).SetJanCode(janCode); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidJanCode, err)
	}
	found, changed, err := s.repo.SetItemDisabled(ctx, janCode, disabled)
	if err != nil {
		return err
	}
	if !found {
		return ErrItemNotFound
	}
	if !changed {
		if disabled {
			return ErrAlreadyDisabled
		}
		return ErrNotDisabled
	}
	return nil
}
