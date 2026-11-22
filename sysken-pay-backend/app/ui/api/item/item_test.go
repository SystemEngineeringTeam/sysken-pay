package item

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

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
func (emptyItemRepo) GetAllItems(context.Context, bool) ([]*domainitem.Item, error) {
	return nil, nil
}
func (emptyItemRepo) SetItemDisabled(context.Context, string, bool) (bool, bool, error) {
	return false, false, nil
}

func getItem(t *testing.T, janCode string) int {
	t.Helper()
	h := NewItemHandler(nil, nil, item.NewFindItemByJanCodeUseCase(emptyItemRepo{}), nil, nil)
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

// --- 無効／有効 ---

type disabledRepo struct {
	emptyItemRepo
	found, changed bool
	item           *domainitem.Item
}

func (r disabledRepo) SetItemDisabled(context.Context, string, bool) (bool, bool, error) {
	return r.found, r.changed, nil
}
func (r disabledRepo) GetItemByJanCode(context.Context, string) (*domainitem.Item, error) {
	return r.item, nil
}

func post(t *testing.T, repo disabledRepo, path string) *httptest.ResponseRecorder {
	t.Helper()
	h := NewItemHandler(nil, nil, nil, nil, item.NewSetItemDisabledUseCase(repo))
	r := chi.NewRouter()
	r.Post("/v1/item/{jan_code}/disable", h.DisableItem)
	r.Post("/v1/item/{jan_code}/enable", h.EnableItem)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, path, nil))
	return rec
}

func TestDisableEnableItem_Status(t *testing.T) {
	const jan = "4901234567894"
	tests := []struct {
		name string
		repo disabledRepo
		path string
		want int
	}{
		{"無効にできる", disabledRepo{found: true, changed: true}, "/v1/item/" + jan + "/disable", http.StatusOK},
		{"有効に戻せる", disabledRepo{found: true, changed: true}, "/v1/item/" + jan + "/enable", http.StatusOK},
		{"未登録は 404", disabledRepo{}, "/v1/item/" + jan + "/disable", http.StatusNotFound},
		{"すでに無効は 409", disabledRepo{found: true}, "/v1/item/" + jan + "/disable", http.StatusConflict},
		{"無効でないものを有効にすると 409", disabledRepo{found: true}, "/v1/item/" + jan + "/enable", http.StatusConflict},
		{"JAN が不正なら 400", disabledRepo{}, "/v1/item/20K24132/enable", http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := post(t, tt.repo, tt.path).Code; got != tt.want {
				t.Errorf("status = %d, want %d", got, tt.want)
			}
		})
	}
}

// 無効の商品は、未登録（404）とは違って 200 で disabled:true が返る
func TestGetItemByJanCode_Disabled(t *testing.T) {
	it, _ := domainitem.NewItem("4901234567894", "コーラ", 150)
	_ = it.SetID(1)
	_ = it.SetDisabledAt(time.Now())
	h := NewItemHandler(nil, nil, item.NewFindItemByJanCodeUseCase(disabledRepo{item: it}), nil, nil)
	r := chi.NewRouter()
	r.Get("/v1/item/{jan_code}", h.GetItemByJanCode)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/item/4901234567894", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body struct {
		Disabled bool `json:"disabled"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil || !body.Disabled {
		t.Errorf("disabled = %v err=%v, want true", body.Disabled, err)
	}
}
