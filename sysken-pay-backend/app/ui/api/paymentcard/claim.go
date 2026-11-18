package paymentcard

import (
	"errors"
	"log"
	"net/http"
	"net/url"
	"strconv"

	domainuser "sysken-pay-api/app/domain/object/user"
	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
	"sysken-pay-api/app/usecase/paymentcard"

	"github.com/go-chi/chi/v5"
)

// ClaimPath はスマホで開くページの場所。トークンは「#」のあと（フラグメント）に入れる。
// フラグメントはサーバーに送られないので、アクセスログに残らない（ページの中で読み取って本文で送る）
const ClaimPath = "/claim"

type ClaimHandler interface {
	// Create は支払い用バーコードを発行して、5分だけ有効な発行用 QR を作る。管理者パスワードが必要
	Create(w http.ResponseWriter, r *http.Request)
	// Status は発行用 QR の状態（開かれた回数・残り時間）を返す。管理者パスワードが必要
	Status(w http.ResponseWriter, r *http.Request)
}

// NewClaimHandler の publicBaseURL は、スマホで開くページの URL の頭（config.PublicBaseURL）
func NewClaimHandler(uc paymentcard.ClaimUseCase, publicBaseURL string) ClaimHandler {
	return &claimHandlerImpl{uc: uc, publicBaseURL: publicBaseURL}
}

type claimHandlerImpl struct {
	uc            paymentcard.ClaimUseCase
	publicBaseURL string
}

type CreateClaimResponse struct {
	Status           string `json:"status"`
	ClaimID          int64  `json:"claim_id"`
	UserID           string `json:"user_id"`
	UserName         string `json:"user_name"`
	URL              string `json:"url"`
	ExpiresInSeconds int    `json:"expires_in_seconds"`
}

type ClaimStatusResponse struct {
	Status           string `json:"status"`
	OpenCount        int    `json:"open_count"`
	RemainingSeconds int    `json:"remaining_seconds"`
	Expired          bool   `json:"expired"`
}

// ClaimURL はスマホで開くページの URL を作る
func ClaimURL(publicBaseURL, token string) string {
	return publicBaseURL + ClaimPath + "#t=" + url.QueryEscape(token)
}

func (h *claimHandlerImpl) Create(w http.ResponseWriter, r *http.Request) {
	// URL の頭が決まっていないと QR を作れない。発行（古いバーコードの停止）より先に確かめる
	if h.publicBaseURL == "" {
		log.Printf("PUBLIC_BASE_URL is not configured")
		apierrors.RespondError(w, http.StatusServiceUnavailable, "public base url is not configured")
		return
	}

	userID := chi.URLParam(r, "user_id")
	created, err := h.uc.CreateClaim(r.Context(), userID)
	if err != nil {
		log.Printf("Failed to create payment card claim: %v", err)
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

	writeJSON(w, http.StatusCreated, CreateClaimResponse{
		Status:           "success",
		ClaimID:          created.ClaimID,
		UserID:           created.User.ID(),
		UserName:         created.User.UserName(),
		URL:              ClaimURL(h.publicBaseURL, created.Token),
		ExpiresInSeconds: created.ExpiresIn,
	})
}

func (h *claimHandlerImpl) Status(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "claim_id"), 10, 64)
	if err != nil || id <= 0 {
		apierrors.RespondError(w, http.StatusBadRequest, "invalid claim_id")
		return
	}
	st, err := h.uc.Status(r.Context(), id)
	if err != nil {
		if errors.Is(err, paymentcard.ErrClaimNotFound) {
			apierrors.RespondError(w, http.StatusNotFound, "claim not found")
			return
		}
		log.Printf("Failed to get claim status: %v", err)
		apierrors.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	writeJSON(w, http.StatusOK, ClaimStatusResponse{
		Status:           "success",
		OpenCount:        st.OpenCount,
		RemainingSeconds: st.RemainingSeconds,
		Expired:          st.RemainingSeconds <= 0,
	})
}
