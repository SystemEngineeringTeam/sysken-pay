// Package paymentcard は HRI（支払い用バーコードの文字列）の発行・照合の API。設計は docs/phone-payment.md を参照。
package paymentcard

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	domainpc "sysken-pay-api/app/domain/object/paymentcard"
	domainuser "sysken-pay-api/app/domain/object/user"
	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
	"sysken-pay-api/app/usecase/paymentcard"

	"github.com/go-chi/chi/v5"
)

const (
	// 1分間に10回失敗したら、1分間受け付けない
	maxFailures   = 10
	failureWindow = time.Minute
	blockDuration = time.Minute
)

type Handler interface {
	// Issue は HRI を発行する（作り直しも同じ）。POST /v1/user/{user_id}/hri。管理者パスワードが必要
	Issue(w http.ResponseWriter, r *http.Request)
	// Resolve は読み取った HRI の持ち主を返す。GET /v1/user?hri=SP…（認証なし）
	Resolve(w http.ResponseWriter, r *http.Request)
}

func NewHandler(issue paymentcard.IssueUseCase, resolve paymentcard.ResolveUseCase) Handler {
	return &handlerImpl{
		issue:   issue,
		resolve: resolve,
		limiter: newFailureLimiter(maxFailures, failureWindow, blockDuration),
	}
}

type handlerImpl struct {
	issue   paymentcard.IssueUseCase
	resolve paymentcard.ResolveUseCase
	limiter *failureLimiter
}

type IssueResponse struct {
	Status   string `json:"status"`
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	// HRI は支払い用バーコードの文字列（SP + 16文字）。このレスポンスでしか取り出せない（DB にはハッシュしかない）
	HRI string `json:"hri"`
	// DisplayHRI は画面に出す見やすい形（例: SP 7Q2K X9MD RA4T W8YZ）
	DisplayHRI string `json:"display_hri"`
}

type ResolveResponse struct {
	Status   string `json:"status"`
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
}

func (h *handlerImpl) Issue(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")

	issued, err := h.issue.Issue(r.Context(), userID)
	if err != nil {
		log.Printf("Failed to issue payment card: %v", err)
		if errors.Is(err, domainuser.ErrUserStopped) {
			apierrors.RespondError(w, http.StatusForbidden, "user stopped")
			return
		}
		if errors.Is(err, paymentcard.ErrUserNotFound) {
			apierrors.RespondError(w, http.StatusNotFound, "user not found")
			return
		}
		apierrors.RespondUseCaseError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, IssueResponse{
		Status:     "success",
		UserID:     issued.User.ID(),
		UserName:   issued.User.UserName(),
		HRI:        issued.Code,
		DisplayHRI: domainpc.DisplayCode(issued.Code),
	})
}

// Resolve の HRI はクエリ（?hri=）で受け取る。URL に載るので、リバースプロキシなどのアクセスログに残らないようにすること
func (h *handlerImpl) Resolve(w http.ResponseWriter, r *http.Request) {
	if h.limiter.Blocked() {
		apierrors.RespondError(w, http.StatusTooManyRequests, "too many failed attempts")
		return
	}

	u, err := h.resolve.Resolve(r.Context(), r.URL.Query().Get("hri"))
	if err != nil {
		// 支払い用バーコードの中身はログに出さない
		switch {
		case errors.Is(err, domainuser.ErrUserStopped):
			// 本物のバーコードなので、当てずっぽうの失敗には数えない
			log.Printf("Payment card of stopped user")
			apierrors.RespondError(w, http.StatusForbidden, "user stopped")
		case errors.Is(err, paymentcard.ErrCardNotFound):
			h.limiter.Fail()
			log.Printf("Payment card not found")
			apierrors.RespondError(w, http.StatusNotFound, "payment card not found")
		case errors.Is(err, domainpc.ErrInvalidCode):
			h.limiter.Fail()
			log.Printf("Invalid payment card format")
			apierrors.RespondError(w, http.StatusBadRequest, "invalid payment code")
		default:
			log.Printf("Failed to resolve payment card: %v", err)
			apierrors.RespondError(w, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	writeJSON(w, http.StatusOK, ResolveResponse{
		Status:   "success",
		UserID:   u.ID(),
		UserName: u.UserName(),
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}
}
