package paymentcard

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	domainuser "sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/usecase/paymentcard"

	"github.com/go-chi/chi/v5"
)

type fakeClaim struct {
	created   *paymentcard.CreatedClaim
	createErr error
	status    *paymentcard.ClaimStatus
	statusErr error
	called    bool
	opened    *paymentcard.OpenedClaim
	openErr   error
	openToken string
}

func (f *fakeClaim) CreateClaim(context.Context, string) (*paymentcard.CreatedClaim, error) {
	f.called = true
	return f.created, f.createErr
}
func (f *fakeClaim) Status(context.Context, int64) (*paymentcard.ClaimStatus, error) {
	return f.status, f.statusErr
}
func (f *fakeClaim) Open(_ context.Context, token string) (*paymentcard.OpenedClaim, error) {
	f.openToken = token
	return f.opened, f.openErr
}

func claimRouter(h ClaimHandler) http.Handler {
	r := chi.NewRouter()
	r.Post("/v1/user/{user_id}/payment-card/claim", h.Create)
	r.Get("/v1/payment-card/claim/{claim_id}", h.Status)
	return r
}

const testToken = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ"

func TestCreateClaim(t *testing.T) {
	ok := &paymentcard.CreatedClaim{ClaimID: 7, Token: testToken, User: testUser(t), ExpiresIn: 300}
	tests := []struct {
		name       string
		baseURL    string
		uc         *fakeClaim
		wantStatus int
	}{
		{"作れる", "http://192.0.2.10:8081", &fakeClaim{created: ok}, http.StatusCreated},
		{"URL の頭が未設定なら作らない", "", &fakeClaim{created: ok}, http.StatusServiceUnavailable},
		{"登録されていない人は404", "http://x", &fakeClaim{createErr: fmt.Errorf("%w: x", paymentcard.ErrUserNotFound)}, http.StatusNotFound},
		{"学籍番号の形式が不正なら400", "http://x", &fakeClaim{createErr: (&domainuser.User{}).SetUserID("abc")}, http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			claimRouter(NewClaimHandler(tt.uc, tt.baseURL)).ServeHTTP(rec,
				httptest.NewRequest(http.MethodPost, "/v1/user/24K01234/payment-card/claim", nil))
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if tt.wantStatus == http.StatusServiceUnavailable && tt.uc.called {
				t.Error("URL が未設定なのに発行してしまった（古いバーコードが止まる）")
			}
			if tt.wantStatus != http.StatusCreated {
				return
			}
			var res CreateClaimResponse
			_ = json.NewDecoder(rec.Body).Decode(&res)
			if res.URL != "http://192.0.2.10:8081/claim#t="+testToken {
				t.Errorf("url = %q", res.URL)
			}
			// トークンは # のあと（サーバーに送られない部分）に入っている
			if before, _, _ := strings.Cut(res.URL, "#"); strings.Contains(before, testToken) {
				t.Error("トークンが URL のパスやクエリに入っている（アクセスログに残る）")
			}
			if res.ClaimID != 7 || res.ExpiresInSeconds != 300 || res.UserName != "シス研太郎" {
				t.Errorf("response = %+v", res)
			}
		})
	}
}

func TestClaimStatus(t *testing.T) {
	tests := []struct {
		name        string
		path        string
		uc          *fakeClaim
		wantStatus  int
		wantExpired bool
	}{
		{"期限内", "/v1/payment-card/claim/7", &fakeClaim{status: &paymentcard.ClaimStatus{OpenCount: 1, RemainingSeconds: 120}}, http.StatusOK, false},
		{"期限切れ", "/v1/payment-card/claim/7", &fakeClaim{status: &paymentcard.ClaimStatus{OpenCount: 0, RemainingSeconds: 0}}, http.StatusOK, true},
		{"存在しない", "/v1/payment-card/claim/7", &fakeClaim{statusErr: paymentcard.ErrClaimNotFound}, http.StatusNotFound, false},
		{"ID が数字でない", "/v1/payment-card/claim/abc", &fakeClaim{}, http.StatusBadRequest, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			claimRouter(NewClaimHandler(tt.uc, "http://x")).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, tt.path, nil))
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if rec.Code == http.StatusOK {
				var res ClaimStatusResponse
				_ = json.NewDecoder(rec.Body).Decode(&res)
				if res.Expired != tt.wantExpired {
					t.Errorf("expired = %v, want %v", res.Expired, tt.wantExpired)
				}
			}
		})
	}
}
