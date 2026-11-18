package paymentcard

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	domainpc "sysken-pay-api/app/domain/object/paymentcard"
	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
	"sysken-pay-api/app/ui/barcode"
	"sysken-pay-api/app/usecase/paymentcard"
)

const (
	// バーコード画像の大きさ。1モジュール4ピクセル（18文字で幅およそ1000ピクセル）
	barcodeScale  = 4
	barcodeHeight = 260
	// トークンは43文字なので、本文はこれで十分
	maxOpenBodyBytes = 1024
)

// ClaimOpenHandler は、スマホで発行用 QR を開いたときに支払い用バーコードを返す。
// 部室の Wi-Fi に開ける入口（docs/phone-payment.md の「ネットワーク」）にだけ置く。
type ClaimOpenHandler interface {
	Open(w http.ResponseWriter, r *http.Request)
}

func NewClaimOpenHandler(uc paymentcard.ClaimUseCase) ClaimOpenHandler {
	return &claimOpenHandlerImpl{
		uc:      uc,
		limiter: newFailureLimiter(maxFailures, failureWindow, blockDuration),
	}
}

type claimOpenHandlerImpl struct {
	uc      paymentcard.ClaimUseCase
	limiter *failureLimiter
}

type OpenClaimRequest struct {
	Token string `json:"token"`
}

type OpenClaimResponse struct {
	Status   string `json:"status"`
	UserName string `json:"user_name"`
	// DisplayCode はバーコードの下に出す文字（例: SP 7Q2K X9MD RA4T W8YZ）。Wallet に手で入れる人のため
	DisplayCode string `json:"display_code"`
	// BarcodePNG はバーコード画像（PNG を base64 にしたもの）
	BarcodePNG string `json:"barcode_png"`
}

// Open のトークンは URL ではなく本文で受け取る（URL はアクセスログに残るため）
func (h *claimOpenHandlerImpl) Open(w http.ResponseWriter, r *http.Request) {
	// 支払い用バーコードを返すので、どこにも保存させない
	w.Header().Set("Cache-Control", "no-store")

	if h.limiter.Blocked() {
		apierrors.RespondError(w, http.StatusTooManyRequests, "too many failed attempts")
		return
	}

	var req OpenClaimRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxOpenBodyBytes)).Decode(&req); err != nil {
		apierrors.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	opened, err := h.uc.Open(r.Context(), req.Token)
	if err != nil {
		// トークンはログに出さない
		switch {
		case errors.Is(err, domainpc.ErrInvalidClaimToken):
			h.limiter.Fail()
			apierrors.RespondError(w, http.StatusBadRequest, "invalid token")
		case errors.Is(err, paymentcard.ErrClaimNotFound):
			h.limiter.Fail()
			log.Printf("Payment card claim not found")
			apierrors.RespondError(w, http.StatusNotFound, "claim not found")
		case errors.Is(err, paymentcard.ErrClaimExpired):
			apierrors.RespondError(w, http.StatusGone, "claim expired")
		default:
			log.Printf("Failed to open payment card claim: %v", err)
			apierrors.RespondError(w, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	img, err := barcode.PNG(opened.Code, barcodeScale, barcodeHeight)
	if err != nil {
		log.Printf("Failed to render barcode: %v", err)
		apierrors.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, OpenClaimResponse{
		Status:      "success",
		UserName:    opened.User.UserName(),
		DisplayCode: domainpc.DisplayCode(opened.Code),
		BarcodePNG:  base64.StdEncoding.EncodeToString(img),
	})
}
