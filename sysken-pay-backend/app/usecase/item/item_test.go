package item

import (
	"context"
	"errors"
	"testing"
	"time"

	domainitem "sysken-pay-api/app/domain/object/item"
)

// --- mock ---

type mockItemRepo struct {
	insertFunc       func(ctx context.Context, item *domainitem.Item) (*domainitem.Item, error)
	updateFunc       func(ctx context.Context, item *domainitem.Item) (*domainitem.Item, error)
	getByIDFunc      func(ctx context.Context, id int) (*domainitem.Item, error)
	getByJanCodeFunc func(ctx context.Context, janCode string) (*domainitem.Item, error)
	getAllFunc       func(ctx context.Context, includeDisabled bool) ([]*domainitem.Item, error)
	setDisabledFunc  func(ctx context.Context, janCode string, disabled bool) (bool, bool, error)
}

func (m *mockItemRepo) InsertItem(ctx context.Context, item *domainitem.Item) (*domainitem.Item, error) {
	return m.insertFunc(ctx, item)
}
func (m *mockItemRepo) UpdateItem(ctx context.Context, item *domainitem.Item) (*domainitem.Item, error) {
	return m.updateFunc(ctx, item)
}
func (m *mockItemRepo) GetItemByID(ctx context.Context, id int) (*domainitem.Item, error) {
	return m.getByIDFunc(ctx, id)
}
func (m *mockItemRepo) GetItemByJanCode(ctx context.Context, janCode string) (*domainitem.Item, error) {
	return m.getByJanCodeFunc(ctx, janCode)
}
func (m *mockItemRepo) GetAllItems(ctx context.Context, includeDisabled bool) ([]*domainitem.Item, error) {
	return m.getAllFunc(ctx, includeDisabled)
}
func (m *mockItemRepo) SetItemDisabled(ctx context.Context, janCode string, disabled bool) (bool, bool, error) {
	return m.setDisabledFunc(ctx, janCode, disabled)
}

const validJAN13 = "4901234567894"
const validJAN8 = "49012347"

// --- RegisterItem ---

func TestRegisterItem_Success(t *testing.T) {
	repo := &mockItemRepo{
		insertFunc: func(_ context.Context, item *domainitem.Item) (*domainitem.Item, error) {
			return item, nil
		},
	}
	uc := NewRegisterItemUseCase(repo)
	result, err := uc.RegisterItem(context.Background(), validJAN13, "コーラ", 150)
	if err != nil {
		t.Fatalf("RegisterItem should succeed: %v", err)
	}
	if result.JanCode() != validJAN13 {
		t.Errorf("JanCode() = %s, want %s", result.JanCode(), validJAN13)
	}
}

func TestRegisterItem_InvalidJanCode(t *testing.T) {
	repo := &mockItemRepo{}
	uc := NewRegisterItemUseCase(repo)
	if _, err := uc.RegisterItem(context.Background(), "1234567890123", "コーラ", 150); err == nil {
		t.Error("RegisterItem with invalid JAN code should fail")
	}
}

func TestRegisterItem_EmptyItemName(t *testing.T) {
	repo := &mockItemRepo{}
	uc := NewRegisterItemUseCase(repo)
	if _, err := uc.RegisterItem(context.Background(), validJAN13, "", 150); err == nil {
		t.Error("RegisterItem with empty item name should fail")
	}
}

func TestRegisterItem_NegativePrice(t *testing.T) {
	repo := &mockItemRepo{}
	uc := NewRegisterItemUseCase(repo)
	if _, err := uc.RegisterItem(context.Background(), validJAN13, "コーラ", -1); err == nil {
		t.Error("RegisterItem with negative price should fail")
	}
}

func TestRegisterItem_ZeroPrice(t *testing.T) {
	repo := &mockItemRepo{
		insertFunc: func(_ context.Context, item *domainitem.Item) (*domainitem.Item, error) {
			return item, nil
		},
	}
	uc := NewRegisterItemUseCase(repo)
	if _, err := uc.RegisterItem(context.Background(), validJAN13, "無料サンプル", 0); err != nil {
		t.Errorf("RegisterItem with price=0 should succeed: %v", err)
	}
}

func TestRegisterItem_RepoError(t *testing.T) {
	repo := &mockItemRepo{
		insertFunc: func(_ context.Context, item *domainitem.Item) (*domainitem.Item, error) {
			return nil, errors.New("db error")
		},
	}
	uc := NewRegisterItemUseCase(repo)
	if _, err := uc.RegisterItem(context.Background(), validJAN13, "コーラ", 150); err == nil {
		t.Error("RegisterItem should propagate repo error")
	}
}

func TestRegisterItem_8DigitJAN(t *testing.T) {
	repo := &mockItemRepo{
		insertFunc: func(_ context.Context, item *domainitem.Item) (*domainitem.Item, error) {
			return item, nil
		},
	}
	uc := NewRegisterItemUseCase(repo)
	if _, err := uc.RegisterItem(context.Background(), validJAN8, "商品", 100); err != nil {
		t.Errorf("RegisterItem with 8-digit JAN should succeed: %v", err)
	}
}

// --- UpdateItem ---

func TestUpdateItem_Success(t *testing.T) {
	repo := &mockItemRepo{
		updateFunc: func(_ context.Context, item *domainitem.Item) (*domainitem.Item, error) {
			return item, nil
		},
	}
	uc := NewUpdateItemUseCase(repo)
	result, err := uc.UpdateItem(context.Background(), validJAN13, "新コーラ", 200)
	if err != nil {
		t.Fatalf("UpdateItem should succeed: %v", err)
	}
	if result.JanCode() != validJAN13 {
		t.Errorf("JanCode() = %s, want %s", result.JanCode(), validJAN13)
	}
}

func TestUpdateItem_InvalidJanCode(t *testing.T) {
	repo := &mockItemRepo{}
	uc := NewUpdateItemUseCase(repo)
	if _, err := uc.UpdateItem(context.Background(), "badcode", "コーラ", 150); err == nil {
		t.Error("UpdateItem with invalid JAN code should fail")
	}
}

func TestUpdateItem_EmptyItemName(t *testing.T) {
	repo := &mockItemRepo{}
	uc := NewUpdateItemUseCase(repo)
	if _, err := uc.UpdateItem(context.Background(), validJAN13, "", 150); err == nil {
		t.Error("UpdateItem with empty item name should fail")
	}
}

func TestUpdateItem_RepoError(t *testing.T) {
	repo := &mockItemRepo{
		updateFunc: func(_ context.Context, item *domainitem.Item) (*domainitem.Item, error) {
			return nil, errors.New("db error")
		},
	}
	uc := NewUpdateItemUseCase(repo)
	if _, err := uc.UpdateItem(context.Background(), validJAN13, "コーラ", 150); err == nil {
		t.Error("UpdateItem should propagate repo error")
	}
}

// --- FindItemByJanCode ---

func TestFindItemByJanCode_Success(t *testing.T) {
	repo := &mockItemRepo{
		getByJanCodeFunc: func(_ context.Context, janCode string) (*domainitem.Item, error) {
			i, _ := domainitem.NewItem(janCode, "コーラ", 150)
			return i, nil
		},
	}
	uc := NewFindItemByJanCodeUseCase(repo)
	result, err := uc.GetItemByJanCode(context.Background(), validJAN13)
	if err != nil {
		t.Fatalf("GetItemByJanCode should succeed: %v", err)
	}
	if result.JanCode() != validJAN13 {
		t.Errorf("JanCode() = %s, want %s", result.JanCode(), validJAN13)
	}
}

func TestFindItemByJanCode_RepoError(t *testing.T) {
	repo := &mockItemRepo{
		getByJanCodeFunc: func(_ context.Context, janCode string) (*domainitem.Item, error) {
			return nil, errors.New("not found")
		},
	}
	uc := NewFindItemByJanCodeUseCase(repo)
	if _, err := uc.GetItemByJanCode(context.Background(), validJAN13); err == nil {
		t.Error("GetItemByJanCode should propagate repo error")
	}
}

// userIDの学籍番号フォーマット等、JANコードとして不正な値はリポジトリに到達せず
// ErrInvalidJanCode を返すこと（ハンドラ側で400にマッピングされる）
func TestFindItemByJanCode_InvalidJanCode(t *testing.T) {
	repo := &mockItemRepo{
		getByJanCodeFunc: func(_ context.Context, _ string) (*domainitem.Item, error) {
			t.Fatal("repository must not be called for invalid janCode")
			return nil, nil
		},
	}
	uc := NewFindItemByJanCodeUseCase(repo)
	if _, err := uc.GetItemByJanCode(context.Background(), "20X24045"); !errors.Is(err, ErrInvalidJanCode) {
		t.Errorf("GetItemByJanCode with student ID should return ErrInvalidJanCode, got: %v", err)
	}
}

// 存在しないJANコード（リポジトリが nil を返す）はそのまま nil を伝播し、
// ハンドラ側で404にマッピングされること（500パニックにならない）
func TestFindItemByJanCode_NotFound(t *testing.T) {
	repo := &mockItemRepo{
		getByJanCodeFunc: func(_ context.Context, _ string) (*domainitem.Item, error) {
			return nil, nil
		},
	}
	uc := NewFindItemByJanCodeUseCase(repo)
	result, err := uc.GetItemByJanCode(context.Background(), validJAN13)
	if err != nil {
		t.Fatalf("GetItemByJanCode should not error when item not found: %v", err)
	}
	if result != nil {
		t.Errorf("GetItemByJanCode should return nil item when not found, got: %v", result)
	}
}

// --- GetAllItems ---

func TestGetAllItems_Success(t *testing.T) {
	i1, _ := domainitem.NewItem(validJAN13, "コーラ", 150)
	i2, _ := domainitem.NewItem(validJAN8, "パン", 200)
	repo := &mockItemRepo{
		getAllFunc: func(_ context.Context, _ bool) ([]*domainitem.Item, error) {
			return []*domainitem.Item{i1, i2}, nil
		},
	}
	uc := NewGetAllItemsUseCase(repo)
	result, err := uc.GetAllItems(context.Background(), false)
	if err != nil {
		t.Fatalf("GetAllItems should succeed: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("len(result) = %d, want 2", len(result))
	}
}

func TestGetAllItems_Empty(t *testing.T) {
	repo := &mockItemRepo{
		getAllFunc: func(_ context.Context, _ bool) ([]*domainitem.Item, error) {
			return []*domainitem.Item{}, nil
		},
	}
	uc := NewGetAllItemsUseCase(repo)
	result, err := uc.GetAllItems(context.Background(), false)
	if err != nil {
		t.Fatalf("GetAllItems should succeed with empty list: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("len(result) = %d, want 0", len(result))
	}
}

func TestGetAllItems_RepoError(t *testing.T) {
	repo := &mockItemRepo{
		getAllFunc: func(_ context.Context, _ bool) ([]*domainitem.Item, error) {
			return nil, errors.New("db error")
		},
	}
	uc := NewGetAllItemsUseCase(repo)
	if _, err := uc.GetAllItems(context.Background(), false); err == nil {
		t.Error("GetAllItems should propagate repo error")
	}
}

// --- Disable / Enable ---

func TestSetItemDisabled(t *testing.T) {
	tests := []struct {
		name    string
		disable bool
		repo    func(context.Context, string, bool) (bool, bool, error)
		want    error // nil なら成功
	}{
		{"無効にできる", true, func(_ context.Context, _ string, d bool) (bool, bool, error) {
			if !d {
				t.Error("disabled=true で呼ばれるはず")
			}
			return true, true, nil
		}, nil},
		{"有効に戻せる", false, func(_ context.Context, _ string, d bool) (bool, bool, error) {
			if d {
				t.Error("disabled=false で呼ばれるはず")
			}
			return true, true, nil
		}, nil},
		{"商品が無ければ ErrItemNotFound", true, func(context.Context, string, bool) (bool, bool, error) { return false, false, nil }, ErrItemNotFound},
		{"すでに無効なら ErrAlreadyDisabled", true, func(context.Context, string, bool) (bool, bool, error) { return true, false, nil }, ErrAlreadyDisabled},
		{"無効でなければ ErrNotDisabled", false, func(context.Context, string, bool) (bool, bool, error) { return true, false, nil }, ErrNotDisabled},
		{"DB エラーはそのまま返す", true, func(context.Context, string, bool) (bool, bool, error) {
			return false, false, errors.New("db down")
		}, errors.New("db down")},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			uc := NewSetItemDisabledUseCase(&mockItemRepo{setDisabledFunc: tt.repo})
			var err error
			if tt.disable {
				err = uc.Disable(context.Background(), validJAN13)
			} else {
				err = uc.Enable(context.Background(), validJAN13)
			}
			switch {
			case tt.want == nil && err != nil:
				t.Errorf("成功するはず: %v", err)
			case tt.want != nil && err == nil:
				t.Errorf("%v になるはず", tt.want)
			case tt.want != nil && errors.Is(tt.want, tt.want) && err.Error() != tt.want.Error() && !errors.Is(err, tt.want):
				t.Errorf("err = %v, want %v", err, tt.want)
			}
		})
	}
}

func TestSetItemDisabled_InvalidJanCode(t *testing.T) {
	// JAN が不正なら DB に触らない（setDisabledFunc が nil のままなので、呼ばれると panic する）
	uc := NewSetItemDisabledUseCase(&mockItemRepo{})
	if err := uc.Disable(context.Background(), "20K24132"); !errors.Is(err, ErrInvalidJanCode) {
		t.Errorf("err = %v, want ErrInvalidJanCode", err)
	}
	if err := uc.Enable(context.Background(), ""); !errors.Is(err, ErrInvalidJanCode) {
		t.Errorf("err = %v, want ErrInvalidJanCode", err)
	}
}

// 無効の商品も JAN で引ける（Disabled() で区別する）。未登録は nil のまま
func TestGetItemByJanCode_ReturnsDisabled(t *testing.T) {
	it, _ := domainitem.NewItem(validJAN13, "コーラ", 150)
	_ = it.SetDisabledAt(time.Now())
	repo := &mockItemRepo{getByJanCodeFunc: func(context.Context, string) (*domainitem.Item, error) { return it, nil }}
	got, err := NewFindItemByJanCodeUseCase(repo).GetItemByJanCode(context.Background(), validJAN13)
	if err != nil || got == nil || !got.Disabled() {
		t.Errorf("got=%v err=%v, 無効の商品が返るはず", got, err)
	}
}
