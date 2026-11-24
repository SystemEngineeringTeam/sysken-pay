// Package member は管理者画面のユーザー一覧と、退部・卒業のとき（返金・利用停止・再開・非表示・削除）の API。
// 一覧は router.go の adminOrSession、それ以外は adminOnly（Entra か管理者パスワード）の中に置く。
package member

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
	"sysken-pay-api/app/ui/api/pkg/timefmt"
	"sysken-pay-api/app/usecase/member"

	"github.com/go-chi/chi/v5"
)

type Handler interface {
	List(w http.ResponseWriter, r *http.Request)
	Refund(w http.ResponseWriter, r *http.Request)
	Stop(w http.ResponseWriter, r *http.Request)
	Resume(w http.ResponseWriter, r *http.Request)
	Hide(w http.ResponseWriter, r *http.Request)
	Unhide(w http.ResponseWriter, r *http.Request)
	Delete(w http.ResponseWriter, r *http.Request)
}

func NewHandler(uc member.UseCase) Handler {
	return &handlerImpl{uc: uc, now: time.Now}
}

type handlerImpl struct {
	uc  member.UseCase
	now func() time.Time
}

type MemberResponse struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	Balance  int    `json:"balance"`
	// Status は "active"（使える）か "stopped"（利用停止）
	Status    string  `json:"status"`
	StoppedAt *string `json:"stopped_at"`
	// HasPaymentCard は使える支払い用バーコードがあるか
	HasPaymentCard bool `json:"has_payment_card"`
	// Unrefunded は止めたのに残高が残っている（まだ返金していない）か
	Unrefunded bool `json:"unrefunded"`
	// GraduationCandidate は年度末の卒業候補か（入学から4年以上たった、使える人）
	GraduationCandidate bool `json:"graduation_candidate"`
	// Hidden は一覧から非表示にした人か（停止中で残高 0 の人だけがなれる）
	Hidden bool `json:"hidden"`
	// Deletable は削除できる人か（停止中で、購入・チャージ・返金の記録が1件もない）
	Deletable bool `json:"deletable"`
}

type ListResponse struct {
	Status string           `json:"status"`
	Users  []MemberResponse `json:"users"`
}

type RefundResponse struct {
	Status         string `json:"status"`
	UserID         string `json:"user_id"`
	RefundedAmount int    `json:"refunded_amount"`
}

type StopResponse struct {
	Status string `json:"status"`
	UserID string `json:"user_id"`
	// Balance は止めたあとに残っている残高（受け取りに来なかった人は残す）
	Balance int `json:"balance"`
}

type ResumeResponse struct {
	Status string `json:"status"`
	UserID string `json:"user_id"`
}

func (h *handlerImpl) List(w http.ResponseWriter, r *http.Request) {
	list, err := h.uc.List(r.Context())
	if err != nil {
		log.Printf("Failed to list members: %v", err)
		apierrors.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	now := h.now()
	res := ListResponse{Status: "success", Users: make([]MemberResponse, 0, len(list))}
	for _, s := range list {
		m := MemberResponse{
			UserID:              s.UserID,
			UserName:            s.UserName,
			Balance:             s.Balance,
			Status:              string(s.Status()),
			HasPaymentCard:      s.HasPaymentCard,
			Unrefunded:          s.Unrefunded(),
			GraduationCandidate: s.GraduationCandidate(now),
			Hidden:              s.Hidden,
			Deletable:           s.Deletable(),
		}
		if s.StoppedAt != nil {
			t := timefmt.JST(*s.StoppedAt)
			m.StoppedAt = &t
		}
		res.Users = append(res.Users, m)
	}
	writeJSON(w, http.StatusOK, res)
}

// respondError はユースケースのエラーを HTTP の応答にする
func respondError(w http.ResponseWriter, action string, err error) {
	switch {
	case errors.Is(err, member.ErrUserNotFound):
		apierrors.RespondError(w, http.StatusNotFound, "user not found")
	case errors.Is(err, member.ErrNothingToRefund):
		apierrors.RespondError(w, http.StatusConflict, "nothing to refund")
	case errors.Is(err, member.ErrAlreadyStopped):
		apierrors.RespondError(w, http.StatusConflict, "user already stopped")
	case errors.Is(err, member.ErrNotStopped):
		apierrors.RespondError(w, http.StatusConflict, "user not stopped")
	case errors.Is(err, member.ErrBalanceRemaining):
		apierrors.RespondError(w, http.StatusConflict, "balance remaining")
	case errors.Is(err, member.ErrAlreadyHidden):
		apierrors.RespondError(w, http.StatusConflict, "user already hidden")
	case errors.Is(err, member.ErrNotHidden):
		apierrors.RespondError(w, http.StatusConflict, "user not hidden")
	case errors.Is(err, member.ErrHasHistory):
		apierrors.RespondError(w, http.StatusConflict, "user has history")
	default:
		log.Printf("Failed to %s: %v", action, err)
		apierrors.RespondUseCaseError(w, err)
	}
}

func (h *handlerImpl) Refund(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")
	amount, err := h.uc.Refund(r.Context(), userID)
	if err != nil {
		respondError(w, "refund", err)
		return
	}
	log.Printf("Refunded: user=%s amount=%d", userID, amount)
	writeJSON(w, http.StatusOK, RefundResponse{Status: "success", UserID: userID, RefundedAmount: amount})
}

func (h *handlerImpl) Stop(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")
	remaining, err := h.uc.Stop(r.Context(), userID)
	if err != nil {
		respondError(w, "stop user", err)
		return
	}
	log.Printf("Stopped: user=%s", userID)
	writeJSON(w, http.StatusOK, StopResponse{Status: "success", UserID: userID, Balance: remaining})
}

func (h *handlerImpl) Resume(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")
	if err := h.uc.Resume(r.Context(), userID); err != nil {
		respondError(w, "resume user", err)
		return
	}
	log.Printf("Resumed: user=%s", userID)
	writeJSON(w, http.StatusOK, ResumeResponse{Status: "success", UserID: userID})
}

type HideResponse struct {
	Status string `json:"status"`
	UserID string `json:"user_id"`
}

type DeleteResponse struct {
	Status string `json:"status"`
	UserID string `json:"user_id"`
}

func (h *handlerImpl) Hide(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")
	if err := h.uc.Hide(r.Context(), userID); err != nil {
		respondError(w, "hide user", err)
		return
	}
	log.Printf("Hidden: user=%s", userID)
	writeJSON(w, http.StatusOK, HideResponse{Status: "success", UserID: userID})
}

func (h *handlerImpl) Unhide(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")
	if err := h.uc.Unhide(r.Context(), userID); err != nil {
		respondError(w, "unhide user", err)
		return
	}
	log.Printf("Unhidden: user=%s", userID)
	writeJSON(w, http.StatusOK, HideResponse{Status: "success", UserID: userID})
}

func (h *handlerImpl) Delete(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")
	if err := h.uc.Delete(r.Context(), userID); err != nil {
		respondError(w, "delete user", err)
		return
	}
	log.Printf("Deleted: user=%s", userID)
	writeJSON(w, http.StatusOK, DeleteResponse{Status: "success", UserID: userID})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}
}
