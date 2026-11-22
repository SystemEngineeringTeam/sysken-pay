package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
)

// TokenVerifier は Bearer のトークンを検証して UPN を返す（EntraVerifier）
type TokenVerifier interface {
	Verify(ctx context.Context, raw string) (upn string, err error)
}

// AllowChecker は UPN が管理者の許可リストにいるかを答える
type AllowChecker interface {
	Exists(ctx context.Context, upn string) (bool, error)
}

type adminUPNKey struct{}

// AdminUPNFromContext は、Entra でログインした管理者の UPN を返す（Basic 認証のときは空・false）
func AdminUPNFromContext(ctx context.Context) (string, bool) {
	upn, ok := ctx.Value(adminUPNKey{}).(string)
	return upn, ok && upn != ""
}

// bearerToken は "Authorization: Bearer xxx" の xxx を返す
func bearerToken(r *http.Request) (string, bool) {
	h := r.Header.Get("Authorization")
	const prefix = "bearer "
	if len(h) <= len(prefix) || !strings.EqualFold(h[:len(prefix)], prefix) {
		return "", false
	}
	return strings.TrimSpace(h[len(prefix):]), true
}

// EntraAuth は Entra の ID トークン（Bearer）で管理系 API を守るミドルウェアを返す。
//
//   - verifier が nil（ENTRA_TENANT_ID / ENTRA_CLIENT_ID が未設定）のときは、すべて 401 で拒否する
//   - トークンが不正なら 401、許可リストにいなければ 403、許可リストを引けなければ 500
//   - トークン・UPN はログに出さない
func EntraAuth(verifier TokenVerifier, allow AllowChecker) func(http.Handler) http.Handler {
	if verifier == nil {
		slog.Warn("ENTRA_TENANT_ID / ENTRA_CLIENT_ID が設定されていないため、Entra のトークンはすべて拒否されます")
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw, ok := bearerToken(r)
			if !ok || raw == "" || verifier == nil {
				apierrors.RespondError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			upn, err := verifier.Verify(r.Context(), raw)
			if err != nil {
				apierrors.RespondError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			allowed, err := allow.Exists(r.Context(), upn)
			if err != nil {
				slog.Error("failed to check admin allowlist", "err", err)
				apierrors.RespondError(w, http.StatusInternalServerError, "internal server error")
				return
			}
			if !allowed {
				apierrors.RespondError(w, http.StatusForbidden, "forbidden")
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), adminUPNKey{}, upn)))
		})
	}
}

// AdminAuth は管理系 API の認証。Bearer なら Entra、それ以外は BASIC 認証に回す。
// BASIC 認証の挙動は変えない（basic をそのまま呼ぶだけ）。
func AdminAuth(basic, entra func(http.Handler) http.Handler) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		viaBasic := basic(next)
		viaEntra := entra(next)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if _, ok := bearerToken(r); ok {
				viaEntra.ServeHTTP(w, r)
				return
			}
			viaBasic.ServeHTTP(w, r)
		})
	}
}
