// Package claimpage は、スマホで発行用 QR を読み取ったときに開くページ（支払い用バーコードの受け取り）。
// 部室の Wi-Fi に開ける入口で配る。設計は docs/phone-payment.md を参照。
//
// ページはフロント（React）ではなく、ここに置いた素の HTML / JS / CSS で作っている:
//   - フロントはラズパイの中（127.0.0.1）だけで配っていて、Wi-Fi には開けない
//   - Wi-Fi に開けるものを、このページと受け取り API だけに絞るため
package claimpage

import (
	"embed"
	"net/http"
)

//go:embed static
var static embed.FS

// Paths はこのページで配るファイルの場所
const (
	PagePath   = "/claim"
	ScriptPath = "/claim/app.js"
	StylePath  = "/claim/app.css"
)

// SecurityHeaders はこの入口のすべての応答に付けるヘッダー。
//   - 他のサイトの読み込み・埋め込みをさせない
//   - 支払い用バーコードがキャッシュや Referer に残らないようにする
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Security-Policy",
			"default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'self'; "+
				"base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func serve(name, contentType string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		b, err := static.ReadFile("static/" + name)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", contentType)
		_, _ = w.Write(b)
	}
}

// Page はページ本体（HTML）を返す
func Page() http.HandlerFunc { return serve("index.html", "text/html; charset=utf-8") }

// Script はページの JS を返す
func Script() http.HandlerFunc { return serve("app.js", "text/javascript; charset=utf-8") }

// Style はページの CSS を返す
func Style() http.HandlerFunc { return serve("app.css", "text/css; charset=utf-8") }
