package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	api_charge "sysken-pay-api/app/ui/api/charge"
	api_item "sysken-pay-api/app/ui/api/item"
	api_purchase "sysken-pay-api/app/ui/api/purchase"
	api_user "sysken-pay-api/app/ui/api/user"
	"sysken-pay-api/app/usecase/charge"
	"sysken-pay-api/app/usecase/item"
	"sysken-pay-api/app/usecase/purchase"
	"sysken-pay-api/app/usecase/user"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// 本物のハンドラ + 本物のユースケースで、入力が不正なリクエストが 400 になることを確かめる。
// リポジトリは nil にしてある: 入力チェックで止まらずに DB まで進んだら panic → Recoverer で 500 になり、テストが落ちる。
func TestInvalidInputReturns400(t *testing.T) {
	uh := api_user.NewUserHandler(
		user.NewGetUserUseCase(nil),
		user.NewRegisterUserUseCase(nil),
		user.NewUpdateUserUseCase(nil, nil),
	)
	ih := api_item.NewItemHandler(
		item.NewRegisterItemUseCase(nil),
		item.NewUpdateItemUseCase(nil),
		item.NewFindItemByJanCodeUseCase(nil),
		item.NewGetAllItemsUseCase(nil),
	)
	ch := api_charge.NewChargeHandler(
		charge.NewChargeAmountUseCase(nil, nil),
		charge.NewChargeCancelUseCase(nil),
	)
	ph := api_purchase.NewPurchaseHandler(
		purchase.NewCreatePurchaseUseCase(nil, nil, nil, nil, nil),
		purchase.NewCancelPurchaseUseCase(nil),
	)

	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Post("/v1/user", uh.RegisterUser)
	r.Patch("/v1/user/{user_id}", uh.UpdateUser)
	r.Post("/v1/user/{user_id}/charge", ch.ChargeAmount)
	r.Post("/v1/user/{user_id}/charge/cancel", ch.ChargeCancel)
	r.Post("/v1/user/{user_id}/purchase", ph.CreatePurchase)
	r.Post("/v1/user/{user_id}/purchase/cancel", ph.CancelPurchase)
	r.Post("/v1/item", ih.ResisterItem)

	tests := []struct {
		name, method, path, body string
	}{
		{"ユーザー登録: 学籍番号の形式が不正", http.MethodPost, "/v1/user", `{"user_id":"abc","user_name":"太郎"}`},
		{"ユーザー登録: 名前が空", http.MethodPost, "/v1/user", `{"user_id":"20K23099","user_name":""}`},
		{"ユーザー更新: 名前が空", http.MethodPatch, "/v1/user/20K23099", `{"user_name":""}`},
		{"チャージ: 許可されていない金額", http.MethodPost, "/v1/user/20K23099/charge", `{"amount":123}`},
		{"チャージ取消: 許可されていない金額", http.MethodPost, "/v1/user/20K23099/charge/cancel", `{"amount":123}`},
		{"商品登録: JANコードが不正", http.MethodPost, "/v1/item", `{"jan_code":"123","item_name":"コーラ","price":100}`},
		{"商品登録: 価格がマイナス", http.MethodPost, "/v1/item", `{"jan_code":"4901234567894","item_name":"コーラ","price":-1}`},
		{"購入: 数量が0", http.MethodPost, "/v1/user/20K23099/purchase", `{"items":[{"item_id":1,"quantity":0}]}`},
		{"購入: 商品が空", http.MethodPost, "/v1/user/20K23099/purchase", `{"items":[]}`},
		{"購入取消: 数量が0", http.MethodPost, "/v1/user/20K23099/purchase/cancel", `{"items":[{"item_id":1,"quantity":0}]}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)
			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want 400 (body: %s)", rec.Code, rec.Body.String())
			}
		})
	}
}
