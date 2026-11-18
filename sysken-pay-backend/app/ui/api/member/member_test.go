package member

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"sysken-pay-api/app/domain/derrors"
	domainmember "sysken-pay-api/app/domain/object/member"
	"sysken-pay-api/app/usecase/member"

	"github.com/go-chi/chi/v5"
)

type fakeUC struct {
	list   []*domainmember.Summary
	amount int
	err    error
}

func (f *fakeUC) List(context.Context) ([]*domainmember.Summary, error) { return f.list, f.err }
func (f *fakeUC) Refund(context.Context, string) (int, error)           { return f.amount, f.err }
func (f *fakeUC) Stop(context.Context, string) (int, error)             { return f.amount, f.err }
func (f *fakeUC) Resume(context.Context, string) error                  { return f.err }

func serve(h Handler, method, path string) *httptest.ResponseRecorder {
	r := chi.NewRouter()
	r.Get("/v1/user", h.List)
	r.Post("/v1/user/{user_id}/refund", h.Refund)
	r.Post("/v1/user/{user_id}/stop", h.Stop)
	r.Post("/v1/user/{user_id}/resume", h.Resume)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func TestList(t *testing.T) {
	stopped := time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC)
	uc := &fakeUC{list: []*domainmember.Summary{
		{UserID: "22K01234", UserName: "k22000_yamadataro", Balance: 300, HasPaymentCard: true},
		{UserID: "24K00001", UserName: "k24000_suzuki", Balance: 500, StoppedAt: &stopped},
	}}
	h := &handlerImpl{uc: uc, now: func() time.Time { return time.Date(2026, 11, 19, 12, 0, 0, 0, time.UTC) }}
	rec := serve(h, http.MethodGet, "/v1/user")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	var res ListResponse
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatal(err)
	}
	if len(res.Users) != 2 {
		t.Fatalf("users = %d", len(res.Users))
	}
	a, b := res.Users[0], res.Users[1]
	if a.Status != "active" || !a.GraduationCandidate || a.Unrefunded || a.StoppedAt != nil || !a.HasPaymentCard {
		t.Errorf("1人目 = %+v", a)
	}
	if b.Status != "stopped" || b.GraduationCandidate || !b.Unrefunded || b.StoppedAt == nil {
		t.Errorf("2人目 = %+v", b)
	}
}

func TestActions(t *testing.T) {
	tests := []struct {
		name string
		path string
		err  error
		want int
	}{
		{"返金", "/v1/user/22K01234/refund", nil, http.StatusOK},
		{"返金：残高0", "/v1/user/22K01234/refund", member.ErrNothingToRefund, http.StatusConflict},
		{"返金：いない人", "/v1/user/22K01234/refund", member.ErrUserNotFound, http.StatusNotFound},
		{"返金：形式が不正", "/v1/user/abc/refund", derrors.Invalid("bad"), http.StatusBadRequest},
		{"停止", "/v1/user/22K01234/stop", nil, http.StatusOK},
		{"停止：止めた人", "/v1/user/22K01234/stop", member.ErrAlreadyStopped, http.StatusConflict},
		{"再開", "/v1/user/22K01234/resume", nil, http.StatusOK},
		{"再開：使える人", "/v1/user/22K01234/resume", member.ErrNotStopped, http.StatusConflict},
		{"それ以外は500", "/v1/user/22K01234/stop", errors.New("db down"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(NewHandler(&fakeUC{amount: 700, err: tt.err}), http.MethodPost, tt.path)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d", rec.Code, tt.want)
			}
		})
	}
}
