package paymentcard

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	domainpc "sysken-pay-api/app/domain/object/paymentcard"
	"sysken-pay-api/app/usecase/paymentcard"
)

func postOpen(h ClaimOpenHandler, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.Open(rec, httptest.NewRequest(http.MethodPost, "/claim/open", strings.NewReader(body)))
	return rec
}

func TestOpenClaim(t *testing.T) {
	ok := &paymentcard.OpenedClaim{User: testUser(t), Code: "SP7Q2KX9MDRA4TW8YZ"}
	tests := []struct {
		name       string
		body       string
		uc         *fakeClaim
		wantStatus int
	}{
		{"開ける", `{"token":"` + testToken + `"}`, &fakeClaim{opened: ok}, http.StatusOK},
		{"本文が壊れていたら400", `{`, &fakeClaim{opened: ok}, http.StatusBadRequest},
		{"トークンの形式が不正なら400", `{"token":"x"}`, &fakeClaim{openErr: domainpc.ErrInvalidClaimToken}, http.StatusBadRequest},
		{"無い QR は404", `{"token":"` + testToken + `"}`, &fakeClaim{openErr: paymentcard.ErrClaimNotFound}, http.StatusNotFound},
		{"期限切れの QR は410", `{"token":"` + testToken + `"}`, &fakeClaim{openErr: paymentcard.ErrClaimExpired}, http.StatusGone},
		{"それ以外は500", `{"token":"` + testToken + `"}`, &fakeClaim{openErr: errors.New("db down")}, http.StatusInternalServerError},
		{"大きすぎる本文は400", `{"token":"` + strings.Repeat("a", 2000) + `"}`, &fakeClaim{opened: ok}, http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := postOpen(NewClaimOpenHandler(tt.uc), tt.body)
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if rec.Header().Get("Cache-Control") != "no-store" {
				t.Error("Cache-Control: no-store が付いていない")
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if tt.uc.openToken != testToken {
				t.Errorf("token = %q", tt.uc.openToken)
			}
			var res OpenClaimResponse
			if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
				t.Fatal(err)
			}
			if res.UserName != "シス研太郎" || res.DisplayCode != "SP 7Q2K X9MD RA4T W8YZ" {
				t.Errorf("res = %+v", res)
			}
			raw, err := base64.StdEncoding.DecodeString(res.BarcodePNG)
			if err != nil {
				t.Fatal(err)
			}
			if _, err := png.Decode(bytes.NewReader(raw)); err != nil {
				t.Errorf("バーコード画像が PNG になっていない: %v", err)
			}
		})
	}
}

func TestOpenClaimBlocksAfterFailures(t *testing.T) {
	uc := &fakeClaim{openErr: paymentcard.ErrClaimNotFound}
	h := NewClaimOpenHandler(uc)
	for i := 0; i < maxFailures; i++ {
		postOpen(h, `{"token":"`+testToken+`"}`)
	}
	// 失敗が続いたあとは、正しい QR でもしばらく受け付けない
	uc.openErr = nil
	uc.opened = &paymentcard.OpenedClaim{User: testUser(t), Code: "SP7Q2KX9MDRA4TW8YZ"}
	if rec := postOpen(h, `{"token":"`+testToken+`"}`); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want 429", rec.Code)
	}
}

func TestOpenClaimExpiredDoesNotCountAsFailure(t *testing.T) {
	uc := &fakeClaim{openErr: paymentcard.ErrClaimExpired}
	h := NewClaimOpenHandler(uc)
	for i := 0; i < maxFailures+2; i++ {
		postOpen(h, `{"token":"`+testToken+`"}`)
	}
	if rec := postOpen(h, `{"token":"`+testToken+`"}`); rec.Code != http.StatusGone {
		t.Fatalf("status = %d, want 410（期限切れは当てずっぽうではないので止めない）", rec.Code)
	}
}
