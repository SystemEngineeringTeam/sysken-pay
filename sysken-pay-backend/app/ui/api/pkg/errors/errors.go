package errors

import (
	"encoding/json"
	"errors"
	"net/http"

	"sysken-pay-api/app/domain/derrors"
)

// ErrorResponse は API のエラーレスポンスの共通フォーマットです。
type ErrorResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// RespondError は指定されたステータスコードとメッセージで
// `{ "status": "error", "message": "..." }` 形式の JSON を返します。
func RespondError(w http.ResponseWriter, statusCode int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	// エンコードが失敗した場合はログ等へ出力する実装に置き換えてください。
	_ = json.NewEncoder(w).Encode(ErrorResponse{
		Status:  "error",
		Message: msg,
	})
}

// RespondUseCaseError はユースケースから返ったエラーを、種類に応じたステータスで返します。
//   - 入力が不正（derrors.ErrInvalidInput）→ 400
//   - それ以外 → 500
//
// 404 や 409 など個別に扱うエラーは、これを呼ぶ前にハンドラで判定してください。
func RespondUseCaseError(w http.ResponseWriter, err error) {
	if errors.Is(err, derrors.ErrInvalidInput) {
		RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	RespondError(w, http.StatusInternalServerError, err.Error())
}
