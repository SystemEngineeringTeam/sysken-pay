package server

import (
	"net/http"
	"time"

	api_paymentcard "sysken-pay-api/app/ui/api/paymentcard"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// ClaimPort は「支払い用バーコードを受け取るページ」の入口のポート（コンテナの中）。
// 部室の Wi-Fi に開けるのはこの入口だけ（docs/phone-payment.md の「ネットワーク」）
const ClaimPort = 8081

// claimSecurityHeaders はこの入口のすべての応答に付けるヘッダー。
// 支払い用バーコードがキャッシュや Referer に残らないようにし、他のサイトからの埋め込みをさせない。
func claimSecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

// newClaimRouter は部室の Wi-Fi に開ける入口のルーティングを組み立てる。
// 置くのは受け取り API だけ（受け取りページは別の静的サイト sysken-pay-qr に移した）。既存の API（購入など）はここには置かない。
// 同じ入口から配るので CORS は付けない（他のサイトからは呼べない）。
func newClaimRouter(open api_paymentcard.ClaimOpenHandler, timeout time.Duration) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RealIP)
	// URL にはトークンが無い（# のあとはサーバーに送られない）ので、ログに出してよい
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(timeout))
	r.Use(claimSecurityHeaders)

	r.Post(api_paymentcard.ClaimPath+"/open", open.Open)

	return r
}
