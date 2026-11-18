package errors

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"sysken-pay-api/app/domain/derrors"
)

func TestRespondUseCaseError(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		{"入力不正は400", derrors.Invalid("quantity must be positive"), http.StatusBadRequest},
		{"ラップされた入力不正も400", fmt.Errorf("usecase: %w", derrors.Invalid("x")), http.StatusBadRequest},
		{"それ以外は500", errors.New("db down"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			RespondUseCaseError(rec, tt.err)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d", rec.Code, tt.want)
			}
		})
	}
}
