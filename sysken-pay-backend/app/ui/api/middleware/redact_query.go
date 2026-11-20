package middleware

import (
	"net/http"
	"net/url"
)

// RedactQuery は、アクセスログに残したくないクエリの値を伏せるミドルウェアを返す。
// middleware.Logger より前に置く。
//
// GET /v1/user?hri=SP… の HRI（支払い用バーコードの中身）は、それだけで支払いに使えるので、
// アクセスログ（docker compose logs）に残さない。
// ログが使う r.RequestURI だけを書き換え、ハンドラが読む r.URL はそのまま残す。
func RedactQuery(keys ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			q := r.URL.Query()
			redacted := false
			for _, k := range keys {
				if q.Has(k) {
					q.Set(k, "REDACTED")
					redacted = true
				}
			}
			if redacted {
				r2 := r.Clone(r.Context())
				u := url.URL{Path: r.URL.Path, RawPath: r.URL.RawPath, RawQuery: q.Encode()}
				r2.RequestURI = u.RequestURI()
				// ハンドラには元の URL（本物の値）を渡す
				r2.URL = r.URL
				next.ServeHTTP(w, r2)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
