package item

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
	"sysken-pay-api/app/usecase/item"

	"github.com/go-chi/chi/v5"
)

//TODO APIリクエストからデータを整形してユースケースに渡すための構造体を作成する

type Handler interface {
	ResisterItem(w http.ResponseWriter, r *http.Request)
	UpdateItem(w http.ResponseWriter, r *http.Request)
	GetItemByJanCode(w http.ResponseWriter, r *http.Request)
	GetAllItems(w http.ResponseWriter, r *http.Request)
	DisableItem(w http.ResponseWriter, r *http.Request)
	EnableItem(w http.ResponseWriter, r *http.Request)
}

func NewItemHandler(registerItemUseCase item.RegisterItemUseCase, updateItemUseCase item.UpdateItemUseCase, findItemByJanCodeUseCase item.FindItemByJanCodeUseCase, getAllItemsUseCase item.GetAllItemsUseCase, setItemDisabledUseCase item.SetItemDisabledUseCase) Handler {
	return &itemHandlerImpl{
		registerItemUseCase:      registerItemUseCase,
		updateItemUseCase:        updateItemUseCase,
		findItemByJanCodeUseCase: findItemByJanCodeUseCase,
		getAllItemsUseCase:       getAllItemsUseCase,
		setItemDisabledUseCase:   setItemDisabledUseCase,
	}
}

var _ Handler = (*itemHandlerImpl)(nil)

type itemHandlerImpl struct {
	registerItemUseCase      item.RegisterItemUseCase
	updateItemUseCase        item.UpdateItemUseCase
	findItemByJanCodeUseCase item.FindItemByJanCodeUseCase
	getAllItemsUseCase       item.GetAllItemsUseCase
	setItemDisabledUseCase   item.SetItemDisabledUseCase
}

func (h *itemHandlerImpl) ResisterItem(w http.ResponseWriter, r *http.Request) {

	var req PostItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Failed to decode request body: %v", err)
		apierrors.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	ctx := r.Context()
	//ユースケースの呼び出し
	createdItem, err := h.registerItemUseCase.RegisterItem(ctx, req.JanCode, req.ItemName, req.Price)
	if err != nil {
		log.Printf("Failed to register item: %v", err)
		apierrors.RespondUseCaseError(w, err)
		return
	}

	//レスポンスの作成
	res := toPostItemResponse(createdItem)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(res); err != nil {
		apierrors.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
}

func (h *itemHandlerImpl) UpdateItem(w http.ResponseWriter, r *http.Request) {

	var req PatchItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Failed to decode request body: %v", err)
		apierrors.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	ctx := r.Context()
	//ユースケースの呼び出し
	updatedItem, err := h.updateItemUseCase.UpdateItem(ctx, req.JanCode, req.ItemName, req.Price)
	if err != nil {
		log.Printf("Failed to update item: %v", err)
		apierrors.RespondUseCaseError(w, err)
		return
	}

	//レスポンスの作成
	res := toPatchItemResponse(updatedItem)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(res); err != nil {
		apierrors.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
}

func (h *itemHandlerImpl) GetItemByJanCode(w http.ResponseWriter, r *http.Request) {

	janCode := chi.URLParam(r, "jan_code")
	if janCode == "" {
		log.Printf("jan_code is missing in URL")
		apierrors.RespondError(w, http.StatusBadRequest, "jan_code is required")
		return
	}

	ctx := r.Context()
	//ユースケースの呼び出し
	foundItem, err := h.findItemByJanCodeUseCase.GetItemByJanCode(ctx, janCode)
	if err != nil {
		log.Printf("Failed to find item by jan code: %v", err)
		if errors.Is(err, item.ErrInvalidJanCode) {
			apierrors.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}
		apierrors.RespondUseCaseError(w, err)
		return
	}
	if foundItem == nil {
		apierrors.RespondError(w, http.StatusNotFound, "item not found")
		return
	}

	//レスポンスの作成
	res := toGetItemResponse(foundItem)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(res); err != nil {
		apierrors.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
}

func (h *itemHandlerImpl) GetAllItems(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	//ユースケースの呼び出し
	allItems, err := h.getAllItemsUseCase.GetAllItems(ctx, r.URL.Query().Get("include_disabled") == "true")
	if err != nil {
		log.Printf("Failed to get all items: %v", err)
		apierrors.RespondUseCaseError(w, err)
		return
	}
	//レスポンスの作成
	res := toGetAllItemsResponse(allItems)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(res); err != nil {
		apierrors.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
}

func (h *itemHandlerImpl) DisableItem(w http.ResponseWriter, r *http.Request) {
	h.setDisabled(w, r, true)
}

func (h *itemHandlerImpl) EnableItem(w http.ResponseWriter, r *http.Request) {
	h.setDisabled(w, r, false)
}

// setDisabled は商品を無効／有効にする。成功は 200、商品が無ければ 404、すでにその状態なら 409
func (h *itemHandlerImpl) setDisabled(w http.ResponseWriter, r *http.Request, disabled bool) {
	janCode := chi.URLParam(r, "jan_code")
	var err error
	if disabled {
		err = h.setItemDisabledUseCase.Disable(r.Context(), janCode)
	} else {
		err = h.setItemDisabledUseCase.Enable(r.Context(), janCode)
	}
	switch {
	case err == nil:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(&SetItemDisabledResponse{Status: "success", JanCode: janCode, Disabled: disabled})
	case errors.Is(err, item.ErrInvalidJanCode):
		apierrors.RespondError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, item.ErrItemNotFound):
		apierrors.RespondError(w, http.StatusNotFound, "item not found")
	case errors.Is(err, item.ErrAlreadyDisabled), errors.Is(err, item.ErrNotDisabled):
		apierrors.RespondError(w, http.StatusConflict, err.Error())
	default:
		log.Printf("Failed to set item disabled=%v: %v", disabled, err)
		apierrors.RespondUseCaseError(w, err)
	}
}
