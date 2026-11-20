package health

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

// pingTimeout は DB の確認を待つ長さ。これを超えたら「つながっていない」とみなす
const pingTimeout = 2 * time.Second

// Pinger は DB につながっているか確かめるもの（*sql.DB がそのまま使える）
type Pinger interface {
	PingContext(ctx context.Context) error
}

// NewCheck は、DB につながっているかまで確かめるヘルスチェックを返す。
// つながっていれば 200 "OK"、つながっていなければ 503 "NG"。
// DB のエラーの中身は、外に出さずログにだけ残す
func NewCheck(db Pinger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")

		ctx, cancel := context.WithTimeout(r.Context(), pingTimeout)
		defer cancel()

		status, body := http.StatusOK, "OK"
		if err := db.PingContext(ctx); err != nil {
			slog.Error("health check: db ping failed", "err", err)
			status, body = http.StatusServiceUnavailable, "NG"
		}

		w.WriteHeader(status)
		if _, err := w.Write([]byte(body)); err != nil {
			// ステータスコードはレスポンスボディ書き込み後に変更できないのでログにエラーを出す
			slog.Error("health check: failed to write response body", "err", err)
		}
	}
}
