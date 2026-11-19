package paymentcard

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	domainpc "sysken-pay-api/app/domain/object/paymentcard"
	domainuser "sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/usecase/paymentcard"

	"github.com/go-chi/chi/v5"
)

const validCode = "SP7Q2KX9MDRA4TW8YZ"

func testUser(t *testing.T) *domainuser.User {
	t.Helper()
	u, err := domainuser.NewUserFromDB("24K01234", "シス研太郎", time.Now().Add(-time.Hour), time.Now().Add(-time.Hour), time.Time{})
	if err != nil {
		t.Fatal(err)
	}
	return u
}

type fakeIssue struct {
	card *paymentcard.IssuedCard
	err  error
}

func (f fakeIssue) Issue(context.Context, string) (*paymentcard.IssuedCard, error) {
	return f.card, f.err
}

type fakeResolve struct {
	user *domainuser.User
	err  error
}

func (f fakeResolve) Resolve(context.Context, string) (*domainuser.User, error) { return f.user, f.err }

func router(h Handler) http.Handler {
	r := chi.NewRouter()
	r.Post("/v1/user/{user_id}/hri", h.Issue)
	r.Get("/v1/user", h.Resolve)
	return r
}

func resolveReq(t *testing.T, r http.Handler, code string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/user?hri="+url.QueryEscape(code), nil))
	return rec
}

func TestIssue(t *testing.T) {
	tests := []struct {
		name       string
		uc         fakeIssue
		wantStatus int
	}{
		{"発行できる", fakeIssue{card: &paymentcard.IssuedCard{User: testUser(t), Code: validCode}}, http.StatusCreated},
		{"登録されていない人は404", fakeIssue{err: fmt.Errorf("%w: x", paymentcard.ErrUserNotFound)}, http.StatusNotFound},
		{"学籍番号の形式が不正なら400", fakeIssue{err: (&domainuser.User{}).SetUserID("abc")}, http.StatusBadRequest},
		{"それ以外は500", fakeIssue{err: errors.New("db down")}, http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			router(NewHandler(tt.uc, nil)).ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/v1/user/24K01234/hri", nil))
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusCreated {
				return
			}
			var res IssueResponse
			if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
				t.Fatal(err)
			}
			if res.HRI != validCode || res.DisplayHRI != "SP 7Q2K X9MD RA4T W8YZ" || res.UserName != "シス研太郎" {
				t.Errorf("response = %+v", res)
			}
		})
	}
}

func TestResolve(t *testing.T) {
	tests := []struct {
		name       string
		uc         fakeResolve
		wantStatus int
	}{
		{"持ち主が分かる", fakeResolve{user: testUser(t)}, http.StatusOK},
		{"無い・使えないバーコードは404", fakeResolve{err: paymentcard.ErrCardNotFound}, http.StatusNotFound},
		{"形式が不正なら400", fakeResolve{err: domainpc.ErrInvalidCode}, http.StatusBadRequest},
		{"利用停止した人のバーコードは403", fakeResolve{err: domainuser.ErrUserStopped}, http.StatusForbidden},
		{"それ以外は500", fakeResolve{err: errors.New("db down")}, http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := resolveReq(t, router(NewHandler(nil, tt.uc)), validCode)
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if tt.wantStatus == http.StatusOK {
				var res ResolveResponse
				_ = json.NewDecoder(rec.Body).Decode(&res)
				if res.UserID != "24K01234" || res.UserName != "シス研太郎" {
					t.Errorf("response = %+v", res)
				}
			}
			// 500 のときに内部のエラー内容を返さない
			if tt.wantStatus == http.StatusInternalServerError && strings.Contains(rec.Body.String(), "db down") {
				t.Error("内部のエラー内容がレスポンスに出ている")
			}
		})
	}
}

func TestResolve_DoesNotLogCode(t *testing.T) {
	var buf bytes.Buffer
	log.SetOutput(&buf)
	defer log.SetOutput(os.Stderr)

	for _, uc := range []fakeResolve{
		{err: paymentcard.ErrCardNotFound},
		{err: domainpc.ErrInvalidCode},
		{err: errors.New("db down")},
	} {
		resolveReq(t, router(NewHandler(nil, uc)), validCode)
	}
	if strings.Contains(buf.String(), validCode) {
		t.Errorf("HRI がログに出ている: %s", buf.String())
	}
}

func TestResolve_BlocksAfterRepeatedFailures(t *testing.T) {
	h := NewHandler(nil, fakeResolve{err: paymentcard.ErrCardNotFound}).(*handlerImpl)
	now := time.Date(2026, 11, 18, 12, 0, 0, 0, time.UTC)
	h.limiter.now = func() time.Time { return now }
	r := router(h)

	for i := 0; i < maxFailures; i++ {
		if rec := resolveReq(t, r, validCode); rec.Code != http.StatusNotFound {
			t.Fatalf("%d回目: status = %d, want 404", i+1, rec.Code)
		}
	}
	// 回数を超えたら、正しいバーコードでもしばらく受け付けない
	h.resolve = fakeResolve{user: testUser(t)}
	if rec := resolveReq(t, r, validCode); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("上限を超えたあと: status = %d, want 429", rec.Code)
	}

	// 時間がたてばまた受け付ける
	now = now.Add(blockDuration + time.Second)
	if rec := resolveReq(t, r, validCode); rec.Code != http.StatusOK {
		t.Fatalf("時間がたったあと: status = %d, want 200", rec.Code)
	}
}

func TestLimiter_OldFailuresExpire(t *testing.T) {
	now := time.Date(2026, 11, 18, 12, 0, 0, 0, time.UTC)
	l := newFailureLimiter(3, time.Minute, time.Minute)
	l.now = func() time.Time { return now }

	l.Fail()
	l.Fail()
	now = now.Add(2 * time.Minute) // 前の2回は数えなくなる
	l.Fail()
	if l.Blocked() {
		t.Error("時間をまたいだ失敗まで数えている")
	}
	l.Fail()
	l.Fail()
	if !l.Blocked() {
		t.Error("短い時間に3回失敗したのに受け付けている")
	}
}
