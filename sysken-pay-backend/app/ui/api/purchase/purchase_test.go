package purchase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	domainpurchase "sysken-pay-api/app/domain/object/purchase"
	"sysken-pay-api/app/usecase/purchase"

	"github.com/go-chi/chi/v5"
)

type fakeCreateUseCase struct{ err error }

func (f fakeCreateUseCase) CreatePurchase(_ context.Context, _ string, _ []purchase.PurchaseItemInput) (*domainpurchase.Purchase, error) {
	return nil, f.err
}

func postPurchase(t *testing.T, uc purchase.CreatePurchaseUseCase) *httptest.ResponseRecorder {
	t.Helper()
	h := NewPurchaseHandler(uc, nil)
	r := chi.NewRouter()
	r.Post("/v1/user/{user_id}/purchase", h.CreatePurchase)

	body := strings.NewReader(`{"items":[{"item_id":1,"quantity":1}]}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/user/20K23099/purchase", body)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func TestCreatePurchase_ErrorMapping(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantMsg    string
	}{
		{
			name:       "残高不足は400",
			err:        fmt.Errorf("%w: balance=100, total=500", purchase.ErrInsufficientBalance),
			wantStatus: http.StatusBadRequest,
			wantMsg:    "insufficient balance",
		},
		{
			name:       "商品が無いのは404",
			err:        fmt.Errorf("%w: itemID=1", purchase.ErrItemNotFound),
			wantStatus: http.StatusNotFound,
			wantMsg:    "item not found",
		},
		{
			name:       "それ以外は500",
			err:        errors.New("db down"),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := postPurchase(t, fakeCreateUseCase{err: tt.err})
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if tt.wantMsg != "" {
				var res struct{ Message string }
				if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
					t.Fatal(err)
				}
				if res.Message != tt.wantMsg {
					t.Errorf("message = %q, want %q", res.Message, tt.wantMsg)
				}
			}
		})
	}
}
