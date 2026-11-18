package derrors

import (
	"errors"
	"fmt"
	"testing"
)

func TestInvalid(t *testing.T) {
	err := Invalid("quantity must be positive")
	if err.Error() != "quantity must be positive" {
		t.Errorf("message = %q", err.Error())
	}
	if !errors.Is(err, ErrInvalidInput) {
		t.Error("Invalid() should be ErrInvalidInput")
	}
	wrapped := fmt.Errorf("usecase: %w", err)
	if !errors.Is(wrapped, ErrInvalidInput) {
		t.Error("wrapped Invalid() should be ErrInvalidInput")
	}
	if errors.Is(errors.New("db down"), ErrInvalidInput) {
		t.Error("plain error should not be ErrInvalidInput")
	}
}
