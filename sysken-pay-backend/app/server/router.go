package server

import (
	"log/slog"
	"net/http"
	"time"

	api_balance "sysken-pay-api/app/ui/api/balance"
	api_charge "sysken-pay-api/app/ui/api/charge"
	"sysken-pay-api/app/ui/api/health"
	api_item "sysken-pay-api/app/ui/api/item"
	api_member "sysken-pay-api/app/ui/api/member"
	apimw "sysken-pay-api/app/ui/api/middleware"
	api_paymentcard "sysken-pay-api/app/ui/api/paymentcard"
	api_purchase "sysken-pay-api/app/ui/api/purchase"
	api_user "sysken-pay-api/app/ui/api/user"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type handlers struct {
	user     api_user.Handler
	item     api_item.Handler
	charge   api_charge.Handler
	purchase api_purchase.Handler
	balance  api_balance.Handler
	// paymentCard は支払い用バーコード（docs/phone-payment.md）
	paymentCard api_paymentcard.Handler
	// paymentCardClaim は支払い用バーコードの発行用 QR（5分だけ有効）
	paymentCardClaim api_paymentcard.ClaimHandler
	// member はユーザー一覧と、退部・卒業のとき（返金・利用停止・再開）
	member api_member.Handler
}

type routerConfig struct {
	adminUser     string
	adminPassword string
	// chargePassword はチャージの画面のパスワード（管理者パスワードでもチャージはできる）
	chargePassword string
	allowedOrigins []string
	timeout        time.Duration
}

// newRouter はルーティングを組み立てる。
//
// 管理者パスワードが必要な操作（お金を動かす・登録内容を変える）は adminOnly の中に置く:
//   - ユーザー登録・更新、商品登録・更新、チャージ、チャージ取消、購入取消、支払い用バーコードの発行
//
// 部員がキオスクでそのまま使う操作は認証なし:
//   - ユーザー・残高・履歴・商品の取得、購入、支払い用バーコードの照合、ヘルスチェック
func newRouter(h handlers, cfg routerConfig) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(newCORS(cfg.allowedOrigins).Handler)
	// リクエストがタイムアウトした場合、ctx.Done()を通じて通知し、以降の処理を停止する
	r.Use(middleware.Timeout(cfg.timeout))

	adminOnly := apimw.BasicAuth(cfg.adminUser, cfg.adminPassword)
	// チャージはチャージ用パスワードか管理者パスワードのどちらでも通す
	if cfg.chargePassword == "" {
		slog.Warn("CHARGE_PASSWORD が設定されていないため、チャージは管理者パスワードでしか入れません")
	}
	chargeOrAdmin := apimw.BasicAuthAny(cfg.adminUser, cfg.adminPassword, cfg.chargePassword)

	r.Route("/v1", func(r chi.Router) {
		// 認証なし（キオスクで部員が使う）
		r.Get("/user/{user_id}", h.user.GetUser)
		r.Get("/user/{user_id}/balance", h.balance.GetBalance)
		r.Get("/user/{user_id}/history", h.balance.GetPurchaseHistories)
		r.Post("/user/{user_id}/purchase", h.purchase.CreatePurchase)
		r.Get("/item", h.item.GetAllItems)
		r.Get("/item/{jan_code}", h.item.GetItemByJanCode)
		r.Get("/health", health.Check)
		// 支払い用バーコードの中身は URL ではなく本文で受け取る（アクセスログに残さないため）
		r.Post("/payment-card/resolve", h.paymentCard.Resolve)

		// チャージ用パスワードか管理者パスワードが必要
		r.Group(func(r chi.Router) {
			r.Use(chargeOrAdmin)
			r.Get("/charge/verify", apimw.Verify)
			r.Post("/user/{user_id}/charge", h.charge.ChargeAmount)
		})

		// 管理者パスワードが必要
		r.Group(func(r chi.Router) {
			r.Use(adminOnly)
			r.Get("/admin/verify", apimw.Verify)
			r.Post("/user", h.user.RegisterUser)
			r.Patch("/user/{user_id}", h.user.UpdateUser)
			r.Post("/user/{user_id}/charge/cancel", h.charge.ChargeCancel)
			r.Post("/user/{user_id}/purchase/cancel", h.purchase.CancelPurchase)
			r.Post("/item", h.item.ResisterItem)
			r.Patch("/item", h.item.UpdateItem)
			// 発行と作り直しは同じ（新しく発行すると古いものは使えなくなる）
			r.Post("/user/{user_id}/payment-card", h.paymentCard.Issue)
			// 発行用 QR（スマホ登録）。作ると支払い用バーコードも作り直される
			r.Post("/user/{user_id}/payment-card/claim", h.paymentCardClaim.Create)
			r.Get("/payment-card/claim/{claim_id}", h.paymentCardClaim.Status)
			// ユーザー一覧（止めた人も含む）と、退部・卒業のとき（docs/phone-payment.md の「退部・卒業」）
			r.Get("/user", h.member.List)
			r.Post("/user/{user_id}/refund", h.member.Refund)
			r.Post("/user/{user_id}/stop", h.member.Stop)
			r.Post("/user/{user_id}/resume", h.member.Resume)
			// 停止中の人の整理。非表示は記録を残す。削除は記録が1件もない人だけ（取り消せない）
			r.Post("/user/{user_id}/hide", h.member.Hide)
			r.Post("/user/{user_id}/unhide", h.member.Unhide)
			r.Delete("/user/{user_id}", h.member.Delete)
		})
	})

	return r
}

func newCORS(allowedOrigins []string) *cors.Cors {
	return cors.New(cors.Options{
		AllowedOrigins: allowedOrigins,
		AllowedHeaders: []string{"Authorization", "Content-Type", "Accept"},
		AllowedMethods: []string{
			http.MethodGet,
			http.MethodHead,
			http.MethodPut,
			http.MethodPatch,
			http.MethodPost,
			http.MethodDelete,
			http.MethodOptions,
		},
	})
}
