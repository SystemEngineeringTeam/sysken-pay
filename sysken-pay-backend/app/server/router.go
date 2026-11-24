package server

import (
	"log/slog"
	"net/http"
	"time"

	api_adminallow "sysken-pay-api/app/ui/api/adminallow"
	api_adminunlock "sysken-pay-api/app/ui/api/adminunlock"
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
	// adminUnlock は管理者のシス研Payバーコードでの解除（ラズパイのチャージ画面・管理メニュー）
	adminUnlock api_adminunlock.Handler
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
	// sessions は管理者バーコードで解除したあとのトークン。nil なら Session はすべて拒否する
	sessions *apimw.SessionStore
}

// newRouter はルーティングを組み立てる。
//
// お金を動かす・登録内容を変える操作は、次のどれかの中に置く:
//   - adminOnly（Entra か管理者パスワード）: 許可リストの編集、ユーザーの更新・返金・利用停止・再開・非表示・削除
//   - adminOrSession（adminOnly に加えて管理者バーコードの Session）: ユーザー登録・一覧、
//     商品登録・更新・無効化、購入取消、支払い用バーコードの発行
//   - chargeOrAdmin（チャージ用パスワードか管理者パスワード、または Session）: チャージ
//
// 部員がキオスクでそのまま使う操作は認証なし:
//   - ユーザー・残高・履歴・商品の取得、購入、支払い用バーコードの照合、管理者バーコードでの解除、ヘルスチェック
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
	// 管理者バーコードで解除したあとの Session も通す。許可リストの編集（権限を増やす操作）だけは通さない
	adminOrSession := apimw.WithSession(cfg.sessions, adminOnly)
	// チャージはチャージ用パスワードか管理者パスワードのどちらでも通す
	if cfg.chargePassword == "" {
		slog.Warn("CHARGE_PASSWORD が設定されていないため、チャージは管理者パスワードでしか入れません")
	}
	chargeOrAdmin := apimw.WithSession(cfg.sessions, apimw.BasicAuthAny(cfg.adminUser, cfg.adminPassword, cfg.chargePassword))

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
			adminOrSession(http.HandlerFunc(h.member.List)).ServeHTTP(w, req)
		})

		// チャージ用パスワードか管理者パスワードが必要
		r.Group(func(r chi.Router) {
			r.Use(chargeOrAdmin)
			r.Get("/charge/verify", apimw.Verify)
			r.Post("/user/{user_id}/charge", h.charge.ChargeAmount)
		})

		// 管理者のバーコードをかざして解除する（認証なし・失敗が続くと 429）。DELETE は解除を取り消す
		r.Post("/admin/unlock", h.adminUnlock.Unlock)
		r.Delete("/admin/unlock", h.adminUnlock.Lock)

		// 管理サイトに Entra でログインしてよい人。最後の1人と自分自身は消せない。
		// 権限を増やす操作なので、バーコードの Session では通さない（Entra か管理者パスワードだけ）
		r.Group(func(r chi.Router) {
			r.Use(adminOnly)
			r.Get("/admin/allowlist", h.adminAllow.ListAllowed)
			r.Post("/admin/allowlist", h.adminAllow.AddAllowed)
			r.Delete("/admin/allowlist/{upn}", h.adminAllow.RemoveAllowed)
		})

		// 管理者パスワードか、管理者バーコードの Session が必要
		r.Group(func(r chi.Router) {
			r.Use(adminOrSession)
			r.Get("/admin/verify", apimw.Verify)
			r.Post("/user", h.user.RegisterUser)
			// HRI の発行と作り直しは同じ。バーコードの Session でも通す（ラズパイの再発行用。リスクは docs/phone-payment.md）（新しく発行すると古いものは使えなくなる）
			r.Post("/user/{user_id}/hri", h.paymentCard.Issue)
			r.Post("/user/{user_id}/purchase/cancel", h.purchase.CancelPurchase)
			r.Post("/item", h.item.ResisterItem)
			r.Patch("/item", h.item.UpdateItem)
			// 商品は消さずに無効にする（買えなくなる）。有効に戻せる
			r.Post("/item/{jan_code}/disable", h.item.DisableItem)
			r.Post("/item/{jan_code}/enable", h.item.EnableItem)
		})

		// ユーザーの登録内容・利用状態と、残高を戻す・記録を消す操作は、
		// バーコードの Session では通さない（Entra か管理者パスワードだけ）。管理者のバーコードを
		// 写し取られても、ユーザーを消されたり返金されたりしないようにする
		r.Group(func(r chi.Router) {
			r.Use(adminOnly)
			r.Patch("/user/{user_id}", h.user.UpdateUser)
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
