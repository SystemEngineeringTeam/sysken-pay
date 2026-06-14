package item

import (
	"context"
	"errors"
	"fmt"
	"sysken-pay-api/app/domain/object/item"
	"sysken-pay-api/app/domain/repository"
)

//TODO ドメイン層のインターフェースに接続して処理を完成させる

// ErrInvalidJanCode は JANコードのフォーマットが不正な場合に返されます。
var ErrInvalidJanCode = errors.New("invalid janCode")

type FindItemByJanCodeUseCase interface {
	GetItemByJanCode(ctx context.Context, janCode string) (*item.Item, error)
}

type FindItemByJanCodeServiceImpl struct {
	itemFindRepo repository.ItemRepository
}

func NewFindItemByJanCodeUseCase(
	itemFindByJanCodeRepo repository.ItemRepository,
) *FindItemByJanCodeServiceImpl {
	return &FindItemByJanCodeServiceImpl{
		itemFindRepo: itemFindByJanCodeRepo,
	}
}

func (s *FindItemByJanCodeServiceImpl) GetItemByJanCode(
	ctx context.Context, janCode string) (*item.Item, error) {

	// JANコードのフォーマットを検証する（userIDの学籍番号フォーマット等の不正値は400として扱う）
	if err := (&item.Item{}).SetJanCode(janCode); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidJanCode, err)
	}

	foundItemByJanCode, err := s.itemFindRepo.GetItemByJanCode(ctx, janCode)
	if err != nil {
		return nil, err
	}

	return foundItemByJanCode, nil
}
