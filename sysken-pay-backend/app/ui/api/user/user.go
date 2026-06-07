package user

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	domainuser "sysken-pay-api/app/domain/object/user"
	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
	"sysken-pay-api/app/usecase/user"

	"github.com/go-chi/chi/v5"
)

// TODO　APIリクエストからデータを整形してユースケースに情報を渡すものを作成する
type Handler interface {
	GetUser(w http.ResponseWriter, r *http.Request)
	RegisterUser(w http.ResponseWriter, r *http.Request)
	UpdateUser(w http.ResponseWriter, r *http.Request)
}

func NewUserHandler(
	getUserUseCase user.GetUserUseCase,
	registerUserUseCase user.RegisterUserUseCase,
	updateUserUseCase user.UpdateUserUseCase,
) Handler {
	return &userHandlerImpl{
		getUserUseCase:      getUserUseCase,
		registerUserUseCase: registerUserUseCase,
		updateUserUseCase:   updateUserUseCase,
	}
}

var _ Handler = (*userHandlerImpl)(nil)

type userHandlerImpl struct {
	getUserUseCase      user.GetUserUseCase
	registerUserUseCase user.RegisterUserUseCase
	updateUserUseCase   user.UpdateUserUseCase
}

func (h *userHandlerImpl) GetUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")
	if userID == "" {
		log.Printf("user_id is missing in URL")
		apierrors.RespondError(w, http.StatusBadRequest, "user_id is required")
		return
	}

	ctx := r.Context()
	foundUser, err := h.getUserUseCase.GetUser(ctx, userID)
	if err != nil {
		log.Printf("Failed to get user: %v", err)
		if errors.Is(err, user.ErrInvalidUserID) {
			apierrors.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}
		apierrors.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if foundUser == nil {
		apierrors.RespondError(w, http.StatusNotFound, "user not found")
		return
	}

	res := toGetUserResponse(foundUser)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(res); err != nil {
		apierrors.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
}

func (h *userHandlerImpl) RegisterUser(w http.ResponseWriter, r *http.Request) {
	//userRequestのパース
	var req PostUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Failed to decode request body: %v", err)
		apierrors.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	ctx := r.Context()
	//ユースケースの呼び出し
	createdUser, err := h.registerUserUseCase.RegisterUser(ctx, req.UserID, req.UserName)
	if err != nil {
		log.Printf("Failed to register user: %v", err)
		if errors.Is(err, domainuser.ErrUserAlreadyExists) {
			apierrors.RespondError(w, http.StatusConflict, "user already exists")
			return
		}
		apierrors.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	//レスポンスの作成
	res := toPostUserResponse(createdUser)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(res); err != nil {
		apierrors.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
}

func (h *userHandlerImpl) UpdateUser(w http.ResponseWriter, r *http.Request) {
	//userRequestのパース
	var req PatchUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Failed to decode request body: %v", err)
		apierrors.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	userID := chi.URLParam(r, "user_id")
	if userID == "" {
		log.Printf("user_id is missing in URL")
		apierrors.RespondError(w, http.StatusBadRequest, "user_id is required")
		return
	}

	ctx := r.Context()
	//ユースケースの呼び出し
	updatedUser, err := h.updateUserUseCase.UpdateUser(ctx, userID, req.UserName)
	if err != nil {
		log.Printf("Failed to register user: %v", err)
		apierrors.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	//レスポンスの作成
	res := toPatchUserResponse(updatedUser)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(res); err != nil {
		apierrors.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
}
