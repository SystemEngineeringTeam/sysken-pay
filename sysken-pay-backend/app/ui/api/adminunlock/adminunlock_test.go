package adminunlock

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	domainpc "sysken-pay-api/app/domain/object/paymentcard"
	domainuser "sysken-pay-api/app/domain/object/user"
	apimw "sysken-pay-api/app/ui/api/middleware"
	uc "sysken-pay-api/app/usecase/adminunlock"
	"sysken-pay-api/app/usecase/paymentcard"
)

type fakeUC struct{ err error }

func (f fakeUC) Unlock(context.Context, string) error { return f.err }

func post(h Handler, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/v1/admin/unlock", strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.Unlock(rec, req)
	return rec
}

func TestUnlock_Success(t *testing.T) {
	store := apimw.NewSessionStore()
	rec := post(NewHandler(fakeUC{}, store), `{"hri":"SPAAAA"}`)
	if rec.Code != 200 {
		t.Fatalf("status = %d", rec.Code)
	}
	var res UnlockResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil || res.Token == "" || res.ExpiresIn != 600 {
		t.Fatalf("res=%+v err=%v", res, err)
	}
	if !store.Valid(res.Token) {
		t.Fatal("返したトークンが有効でない")
	}
	if rec.Header().Get("Cache-Control") != "no-store" {
		t.Error("トークンの応答は no-store")
	}
}

func TestUnlock_Errors(t *testing.T) {
	tests := []struct {
		name string
		err  error
		body string
		want int
	}{
		{"管理者でない", uc.ErrNotAdmin, `{"hri":"x"}`, 403},
		{"利用停止", domainuser.ErrUserStopped, `{"hri":"x"}`, 403},
		{"見つからない", paymentcard.ErrCardNotFound, `{"hri":"x"}`, 404},
		{"形式不正", domainpc.ErrInvalidCode, `{"hri":"x"}`, 400},
		{"その他のエラーは 500", context.DeadlineExceeded, `{"hri":"x"}`, 500},
		{"本文が JSON でない", nil, `nope`, 400},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := apimw.NewSessionStore()
			rec := post(NewHandler(fakeUC{err: tt.err}, store), tt.body)
			if rec.Code != tt.want {
				t.Fatalf("status = %d, want %d", rec.Code, tt.want)
			}
			if strings.Contains(rec.Body.String(), "token") {
				t.Fatal("失敗のときにトークンを返している")
			}
		})
	}
}

func TestUnlock_BlocksAfterRepeatedFailures(t *testing.T) {
	h := NewHandler(fakeUC{err: paymentcard.ErrCardNotFound}, apimw.NewSessionStore()).(*handlerImpl)
	now := time.Date(2026, 11, 23, 12, 0, 0, 0, time.UTC)
	h.limiter.SetClock(func() time.Time { return now })
	for i := 0; i < maxFailures; i++ {
		if rec := post(h, `{"hri":"x"}`); rec.Code != 404 {
			t.Fatalf("%d 回目: %d", i, rec.Code)
		}
	}
	if rec := post(h, `{"hri":"x"}`); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("失敗が続いたあと: %d, want 429", rec.Code)
	}
	// 止まっている間は、正しいバーコードでも受け付けない
	h.uc = fakeUC{}
	if rec := post(h, `{"hri":"x"}`); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("ブロック中: %d, want 429", rec.Code)
	}
	now = now.Add(blockDuration + time.Second)
	if rec := post(h, `{"hri":"x"}`); rec.Code != 200 {
		t.Fatalf("時間がたったあと: %d, want 200", rec.Code)
	}
}

func TestUnlock_NotAdminDoesNotCountAsFailure(t *testing.T) {
	h := NewHandler(fakeUC{err: uc.ErrNotAdmin}, apimw.NewSessionStore())
	for i := 0; i < maxFailures*2; i++ {
		if rec := post(h, `{"hri":"x"}`); rec.Code != 403 {
			t.Fatalf("%d 回目: %d", i, rec.Code)
		}
	}
}

func TestLock_RevokesToken(t *testing.T) {
	store := apimw.NewSessionStore()
	tok, _ := store.Issue()
	h := NewHandler(fakeUC{}, store)
	req := httptest.NewRequest(http.MethodDelete, "/v1/admin/unlock", nil)
	req.Header.Set("Authorization", "Session "+tok)
	rec := httptest.NewRecorder()
	h.Lock(rec, req)
	if rec.Code != 204 || store.Valid(tok) {
		t.Fatalf("status=%d valid=%v", rec.Code, store.Valid(tok))
	}
	// トークンなしでも 204（何も起きない）
	rec = httptest.NewRecorder()
	h.Lock(rec, httptest.NewRequest(http.MethodDelete, "/v1/admin/unlock", nil))
	if rec.Code != 204 {
		t.Fatalf("status=%d", rec.Code)
	}
}
