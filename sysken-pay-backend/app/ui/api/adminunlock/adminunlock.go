// Package adminunlock は、管理者のシス研Payバーコードをかざしたときに、短い間だけ有効な合言葉を渡す API。
// ラズパイのチャージ画面・管理メニューのパスワード入力の代わりになる（予備としてパスワードも使える）。
package adminunlock

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	domainpc "sysken-pay-api/app/domain/object/paymentcard"
	domainuser "sysken-pay-api/app/domain/object/user"
	apimw "sysken-pay-api/app/ui/api/middleware"
	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
	"sysken-pay-api/app/ui/api/pkg/failurelimit"
	"sysken-pay-api/app/usecase/adminunlock"
	"sysken-pay-api/app/usecase/paymentcard"
)

const (
	// 1分間に10回失敗したら、1分間受け付けない（バーコードの照合 API とは別に数える）
	maxFailures   = 10
	failureWindow = time.Minute
	blockDuration = time.Minute
)

type Handler interface {
	// Unlock は HRI を受け取り、持ち主が管理者ならトークンを返す。POST /v1/admin/unlock（認証なし）
	Unlock(w http.ResponseWriter, r *http.Request)
	// Lock はトークンを無効にする。DELETE /v1/admin/unlock（ホームに戻ったとき）
	Lock(w http.ResponseWriter, r *http.Request)
}

func NewHandler(uc adminunlock.UseCase, store *apimw.SessionStore) Handler {
	return &handlerImpl{uc: uc, store: store, limiter: failurelimit.New(maxFailures, failureWindow, blockDuration)}
}

type handlerImpl struct {
	uc      adminunlock.UseCase
	store   *apimw.SessionStore
	limiter *failurelimit.Limiter
}

type unlockRequest struct {
	// HRI は管理者のシス研Payバーコードの文字列。URL に載せないよう、本文で受け取る
	HRI string `json:"hri"`
}

type UnlockResponse struct {
	Status string `json:"status"`
	// Token は以降のリクエストに `Authorization: Session <token>` で付ける
	Token string `json:"token"`
	// ExpiresIn は使わないでいると切れるまでの秒数（使うたびに延びる）
	ExpiresIn int `json:"expires_in"`
}

func (h *handlerImpl) Unlock(w http.ResponseWriter, r *http.Request) {
	if h.limiter.Blocked() {
		apierrors.RespondError(w, http.StatusTooManyRequests, "too many failed attempts")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
	var req unlockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apierrors.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	err := h.uc.Unlock(r.Context(), req.HRI)
	if err != nil {
		// バーコードの中身はログに出さない
		switch {
		case errors.Is(err, adminunlock.ErrNotAdmin):
			// 本物のバーコードなので、当てずっぽうの失敗には数えない
			log.Printf("Admin unlock: not an admin")
			apierrors.RespondError(w, http.StatusForbidden, "not an admin")
		case errors.Is(err, domainuser.ErrUserStopped):
			log.Printf("Admin unlock: stopped user")
			apierrors.RespondError(w, http.StatusForbidden, "user stopped")
		case errors.Is(err, paymentcard.ErrCardNotFound):
			h.limiter.Fail()
			log.Printf("Admin unlock: payment card not found")
			apierrors.RespondError(w, http.StatusNotFound, "payment card not found")
		case errors.Is(err, domainpc.ErrInvalidCode):
			h.limiter.Fail()
			log.Printf("Admin unlock: invalid format")
			apierrors.RespondError(w, http.StatusBadRequest, "invalid payment code")
		default:
			log.Printf("Admin unlock failed: %v", err)
			apierrors.RespondError(w, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	token, err := h.store.Issue()
	if err != nil {
		log.Printf("Admin unlock: failed to issue token: %v", err)
		apierrors.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(UnlockResponse{
		Status:    "success",
		Token:     token,
		ExpiresIn: int(apimw.SessionIdleTimeout.Seconds()),
	})
}

func (h *handlerImpl) Lock(w http.ResponseWriter, r *http.Request) {
	if token, ok := apimw.SessionToken(r); ok {
		h.store.Revoke(token)
	}
	w.WriteHeader(http.StatusNoContent)
}
