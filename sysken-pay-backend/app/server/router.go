package server

import (
	"log/slog"
	"net/http"
	"time"

	api_adminallow "sysken-pay-api/app/ui/api/adminallow"
	api_balance "sysken-pay-api/app/ui/api/balance"
	api_charge "sysken-pay-api/app/ui/api/charge"
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
	// paymentCard は HRI（支払い用バーコードの文字列。docs/phone-payment.md）の発行と照合
	paymentCard api_paymentcard.Handler
	// member はユーザー一覧と、退部・卒業のとき（返金・利用停止・再開）
	member api_member.Handler
	// adminAllow は管理サイトに Entra でログインしてよい人（許可リスト）の編集
	adminAllow api_adminallow.Handler
	// health は DB につながっているかまで確かめる（health.NewCheck）
	health http.HandlerFunc
}

type routerConfig struct {
	adminUser     string
	adminPassword string
	// chargePassword はチャージの画面のパスワード（管理者パスワードでもチャージはできる）
	chargePassword string
	allowedOrigins []string
	timeout        time.Duration
	// entra は Entra の ID トークンの検証器。nil（未設定）なら Bearer はすべて拒否する
	entra apimw.TokenVerifier
	// adminAllowlist は Entra でログインした人が許可リストにいるかの確認
	adminAllowlist apimw.AllowChecker
}

// newRouter はルーティングを組み立てる。
//
// 管理者の認証（Entra か管理者パスワード）が必要な操作（お金を動かす・登録内容を変える）は adminOnly の中に置く:
//   - ユーザー登録・更新、商品登録・更新、チャージ、チャージ取消、購入取消、支払い用バーコードの発行
//
// 部員がキオスクでそのまま使う操作は認証なし:
//   - ユーザー・残高・履歴・商品の取得、購入、支払い用バーコードの照合、ヘルスチェック
func newRouter(h handlers, cfg routerConfig) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	// HRI（支払い用バーコードの中身）をアクセスログに残さない。Logger より前に置くこと
	r.Use(apimw.RedactQuery("hri"))
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(newCORS(cfg.allowedOrigins).Handler)
	// リクエストがタイムアウトした場合、ctx.Done()を通じて通知し、以降の処理を停止する
	r.Use(middleware.Timeout(cfg.timeout))

	// 管理者の認証: Bearer（Entra の ID トークン + 許可リスト）か、BASIC（予備のパスワード）のどちらでも通す
	adminOnly := apimw.AdminAuth(
		apimw.BasicAuth(cfg.adminUser, cfg.adminPassword),
		apimw.EntraAuth(cfg.entra, cfg.adminAllowlist),
	)
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
		r.Get("/health", h.health)
		// GET /v1/user?hri=SP… は、読み取った HRI の持ち主を返す（認証なし・失敗が続くと 429）。
		// hri が無ければ、管理者パスワードが必要なユーザー一覧
		r.Get("/user", func(w http.ResponseWriter, req *http.Request) {
			if req.URL.Query().Has("hri") {
				h.paymentCard.Resolve(w, req)
				return
			}
			adminOnly(http.HandlerFunc(h.member.List)).ServeHTTP(w, req)
		})

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
			// 管理サイトに Entra でログインしてよい人。最後の1人と自分自身は消せない
			r.Get("/admin/allowlist", h.adminAllow.ListAllowed)
			r.Post("/admin/allowlist", h.adminAllow.AddAllowed)
			r.Delete("/admin/allowlist/{upn}", h.adminAllow.RemoveAllowed)
			r.Post("/user", h.user.RegisterUser)
			r.Patch("/user/{user_id}", h.user.UpdateUser)
			r.Post("/user/{user_id}/charge/cancel", h.charge.ChargeCancel)
			r.Post("/user/{user_id}/purchase/cancel", h.purchase.CancelPurchase)
			r.Post("/item", h.item.ResisterItem)
			r.Patch("/item", h.item.UpdateItem)
			// 商品は消さずに無効にする（買えなくなる）。有効に戻せる
			r.Post("/item/{jan_code}/disable", h.item.DisableItem)
			r.Post("/item/{jan_code}/enable", h.item.EnableItem)
			// HRI の発行と作り直しは同じ（新しく発行すると古いものは使えなくなる）
			r.Post("/user/{user_id}/hri", h.paymentCard.Issue)
			// 退部・卒業のとき（docs/phone-payment.md の「退部・卒業」）。ユーザー一覧は上の GET /user
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
