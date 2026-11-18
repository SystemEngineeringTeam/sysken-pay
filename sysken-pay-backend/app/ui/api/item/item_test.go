package item

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	domainitem "sysken-pay-api/app/domain/object/item"
	"sysken-pay-api/app/usecase/item"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// 商品が1件も登録されていないリポジトリ
type emptyItemRepo struct{}

func (emptyItemRepo) GetItemByID(context.Context, int) (*domainitem.Item, error) { return nil, nil }
func (emptyItemRepo) GetItemByJanCode(context.Context, string) (*domainitem.Item, error) {
	return nil, nil
}
func (emptyItemRepo) InsertItem(context.Context, *domainitem.Item) (*domainitem.Item, error) {
	return nil, nil
}
func (emptyItemRepo) UpdateItem(context.Context, *domainitem.Item) (*domainitem.Item, error) {
	return nil, nil
}
func (emptyItemRepo) GetAllItems(context.Context) ([]*domainitem.Item, error) { return nil, nil }

func getItem(t *testing.T, janCode string) int {
	t.Helper()
	h := NewItemHandler(nil, nil, item.NewFindItemByJanCodeUseCase(emptyItemRepo{}), nil)
	r := chi.NewRouter()
	r.Use(middleware.Recoverer) // panic したら 500 になる（#6 の症状）
	r.Get("/v1/item/{jan_code}", h.GetItemByJanCode)

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/item/"+janCode, nil))
	return rec.Code
}

// #6: 商品 API に学籍番号を送ってしまったとき、500（nil pointer の panic）ではなく 400 を返す
func TestGetItemByJanCode_UserIDIsBadRequest(t *testing.T) {
	for _, id := range []string{"20K24132", "20X24045"} {
		if got := getItem(t, id); got != http.StatusBadRequest {
			t.Errorf("GET /v1/item/%s: status = %d, want 400", id, got)
		}
	}
}

// 正しい形式の JAN コードで商品が無いときは、panic せずに 404 を返す
func TestGetItemByJanCode_NotFound(t *testing.T) {
	if got := getItem(t, "4901234567894"); got != http.StatusNotFound {
		t.Errorf("status = %d, want 404", got)
	}
}
