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
	return BasicAuthAny(user, password)
}

// BasicAuthAny は、passwords のどれか1つと合えば通す BASIC 認証のミドルウェアを返す。
// チャージの API を「チャージ用パスワード」と「管理者パスワード」のどちらでも通すために使う。
//
//   - 空のパスワードは使わない（設定していないパスワードで通らないように）。全部空なら、すべて 401
//   - 比較は長さに依存しない定数時間比較で行い、合っても途中でやめない（どのパスワードで合ったかを時間で知られないように）
func BasicAuthAny(user string, passwords ...string) func(http.Handler) http.Handler {
	wantUser := sha256.Sum256([]byte(user))
	var wantPasses [][sha256.Size]byte
	for _, p := range passwords {
		if p != "" {
			wantPasses = append(wantPasses, sha256.Sum256([]byte(p)))
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, p, ok := r.BasicAuth()
			if !ok || len(wantPasses) == 0 {
				apierrors.RespondError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			gotUser := sha256.Sum256([]byte(u))
			gotPass := sha256.Sum256([]byte(p))
			userOK := subtle.ConstantTimeCompare(gotUser[:], wantUser[:]) == 1
			passOK := 0
			for _, want := range wantPasses {
				passOK |= subtle.ConstantTimeCompare(gotPass[:], want[:])
			}
			if !userOK || passOK != 1 {
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
