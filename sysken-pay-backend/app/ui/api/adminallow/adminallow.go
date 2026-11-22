// Package adminallow は、管理サイトに Entra でログインしてよい人（許可リスト）の API。
// どれも管理者の認証が必要（router.go の adminOnly の中に置く）。
//
// 許可リストを触れるのは、すでに入れる人（Entra で許可済み、または予備のパスワード）だけ。
package adminallow

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/url"

	"sysken-pay-api/app/ui/api/middleware"
	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
	"sysken-pay-api/app/ui/api/pkg/timefmt"
	"sysken-pay-api/app/usecase/adminallow"

	"github.com/go-chi/chi/v5"
)

type Handler interface {
	ListAllowed(w http.ResponseWriter, r *http.Request)
	AddAllowed(w http.ResponseWriter, r *http.Request)
	RemoveAllowed(w http.ResponseWriter, r *http.Request)
}

func NewHandler(uc adminallow.UseCase) Handler {
	return &handlerImpl{uc: uc}
}

type handlerImpl struct {
	uc adminallow.UseCase
}

type AllowedResponse struct {
	UPN string `json:"upn"`
	// StudentID は学籍番号（システムアカウントなどは null）
	StudentID *string `json:"student_id"`
	AddedBy   string  `json:"added_by"`
	CreatedAt string  `json:"created_at"`
}

type ListResponse struct {
	Status  string            `json:"status"`
	Admins  []AllowedResponse `json:"admins"`
	Current string            `json:"current"`
}

type AddRequest struct {
	UPN string `json:"upn"`
}

type StatusResponse struct {
	Status string `json:"status"`
	UPN    string `json:"upn"`
}

// actor は操作した人。Entra なら UPN、予備のパスワードなら "password"
func actor(r *http.Request) string {
	if upn, ok := middleware.AdminUPNFromContext(r.Context()); ok {
		return upn
	}
	return adminallow.PasswordActor
}

func (h *handlerImpl) ListAllowed(w http.ResponseWriter, r *http.Request) {
	list, err := h.uc.List(r.Context())
	if err != nil {
		log.Printf("Failed to list admin allowlist: %v", err)
		apierrors.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	res := ListResponse{Status: "success", Admins: make([]AllowedResponse, 0, len(list)), Current: actor(r)}
	for _, a := range list {
		item := AllowedResponse{UPN: a.UPN, AddedBy: a.AddedBy, CreatedAt: timefmt.JST(a.CreatedAt)}
		if a.StudentID != "" {
			s := a.StudentID
			item.StudentID = &s
		}
		res.Admins = append(res.Admins, item)
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *handlerImpl) AddAllowed(w http.ResponseWriter, r *http.Request) {
	var req AddRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<10)).Decode(&req); err != nil {
		apierrors.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	a, err := h.uc.Add(r.Context(), req.UPN, actor(r))
	if err != nil {
		respondError(w, "add admin allowlist", err)
		return
	}
	// UPN は個人情報なのでログに出さない
	log.Print("Admin allowlist: added")
	writeJSON(w, http.StatusCreated, StatusResponse{Status: "success", UPN: a.UPN})
}

func (h *handlerImpl) RemoveAllowed(w http.ResponseWriter, r *http.Request) {
	// @ を含むので、パスのエスケープを戻す
	upn, err := url.PathUnescape(chi.URLParam(r, "upn"))
	if err != nil {
		apierrors.RespondError(w, http.StatusBadRequest, "invalid upn")
		return
	}
	if err := h.uc.Remove(r.Context(), upn, actor(r)); err != nil {
		respondError(w, "remove admin allowlist", err)
		return
	}
	log.Print("Admin allowlist: removed")
	writeJSON(w, http.StatusOK, StatusResponse{Status: "success", UPN: upn})
}

func respondError(w http.ResponseWriter, action string, err error) {
	switch {
	case errors.Is(err, adminallow.ErrAlreadyAllowed):
		apierrors.RespondError(w, http.StatusConflict, "already allowed")
	case errors.Is(err, adminallow.ErrNotFound):
		apierrors.RespondError(w, http.StatusNotFound, "not in allowlist")
	case errors.Is(err, adminallow.ErrLastAdmin):
		apierrors.RespondError(w, http.StatusConflict, "cannot remove the last admin")
	case errors.Is(err, adminallow.ErrSelf):
		apierrors.RespondError(w, http.StatusConflict, "cannot remove yourself")
	default:
		log.Printf("Failed to %s: %v", action, err)
		apierrors.RespondUseCaseError(w, err)
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}
}
