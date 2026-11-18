package middleware

import (
	"crypto/sha256"
	"crypto/subtle"
	"log/slog"
	"net/http"

	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
)

// BasicAuth は管理系 API を BASIC 認証で守るミドルウェアを返す。
//
//   - password が空のときは設定漏れとみなし、すべて 401 で拒否する（開いたままにしない）
//   - 比較は長さに依存しない定数時間比較で行う
//   - WWW-Authenticate ヘッダーは返さない（返すとブラウザが独自のログイン画面を出してしまうため）
func BasicAuth(user, password string) func(http.Handler) http.Handler {
	if password == "" {
		slog.Warn("ADMIN_PASSWORD が設定されていないため、管理系 API はすべて拒否されます")
	}
	wantUser := sha256.Sum256([]byte(user))
	wantPass := sha256.Sum256([]byte(password))

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, p, ok := r.BasicAuth()
			if !ok || password == "" {
				apierrors.RespondError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			gotUser := sha256.Sum256([]byte(u))
			gotPass := sha256.Sum256([]byte(p))
			userOK := subtle.ConstantTimeCompare(gotUser[:], wantUser[:]) == 1
			passOK := subtle.ConstantTimeCompare(gotPass[:], wantPass[:]) == 1
			if !userOK || !passOK {
				apierrors.RespondError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Verify は認証が通ったことだけを返すハンドラ（BasicAuth の内側に置く）。
// フロントのパスワード入力画面が、パスワードが正しいかを確かめるのに使う。
func Verify(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}
