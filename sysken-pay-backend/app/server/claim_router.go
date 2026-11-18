package server

import (
	"net/http"
	"time"

	api_paymentcard "sysken-pay-api/app/ui/api/paymentcard"
	"sysken-pay-api/app/ui/claimpage"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// ClaimPort は「支払い用バーコードを受け取るページ」の入口のポート（コンテナの中）。
// 部室の Wi-Fi に開けるのはこの入口だけ（docs/phone-payment.md の「ネットワーク」）
const ClaimPort = 8081

// newClaimRouter は部室の Wi-Fi に開ける入口のルーティングを組み立てる。
// 置くのは受け取りページと受け取り API だけ。既存の API（購入など）はここには置かない。
// 同じ入口から配るので CORS は付けない（他のサイトからは呼べない）。
func newClaimRouter(open api_paymentcard.ClaimOpenHandler, timeout time.Duration) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RealIP)
	// URL にはトークンが無い（# のあとはサーバーに送られない）ので、ログに出してよい
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(timeout))
	r.Use(claimpage.SecurityHeaders)

	r.Get(claimpage.PagePath, claimpage.Page())
	r.Get(claimpage.ScriptPath, claimpage.Script())
	r.Get(claimpage.StylePath, claimpage.Style())
	r.Get(claimpage.MascotPath, claimpage.Mascot())
	r.Post(api_paymentcard.ClaimPath+"/open", open.Open)

	return r
}
