package adminallow

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"sysken-pay-api/app/domain/derrors"
	"sysken-pay-api/app/domain/repository"
	uc "sysken-pay-api/app/usecase/adminallow"

	"github.com/go-chi/chi/v5"
)

type fakeUC struct {
	list      []repository.AdminAllow
	err       error
	gotUPN    string
	gotBy     string
	removeUPN string
}

func (f *fakeUC) List(context.Context) ([]repository.AdminAllow, error) { return f.list, f.err }
func (f *fakeUC) Add(_ context.Context, upn, by string) (repository.AdminAllow, error) {
	f.gotUPN, f.gotBy = upn, by
	return repository.AdminAllow{UPN: strings.ToLower(upn)}, f.err
}
func (f *fakeUC) Remove(_ context.Context, upn, by string) error {
	f.removeUPN, f.gotBy = upn, by
	return f.err
}

func router(h Handler) http.Handler {
	r := chi.NewRouter()
	r.Get("/v1/admin/allowlist", h.ListAllowed)
	r.Post("/v1/admin/allowlist", h.AddAllowed)
	r.Delete("/v1/admin/allowlist/{upn}", h.RemoveAllowed)
	return r
}

func call(h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestList(t *testing.T) {
	f := &fakeUC{list: []repository.AdminAllow{
		{UPN: "x24042xx@aitech.ac.jp", StudentID: "X24042", AddedBy: "password", CreatedAt: time.Now()},
		{UPN: "sysken@aitech.ac.jp", AddedBy: "x24042xx@aitech.ac.jp", CreatedAt: time.Now()},
	}}
	rec := call(router(NewHandler(f)), http.MethodGet, "/v1/admin/allowlist", "")
	if rec.Code != 200 {
		t.Fatalf("code=%d", rec.Code)
	}
	var res ListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatal(err)
	}
	if len(res.Admins) != 2 || res.Admins[0].StudentID == nil || *res.Admins[0].StudentID != "X24042" || res.Admins[1].StudentID != nil {
		t.Fatalf("res=%+v", res)
	}
	if res.Current != "password" {
		t.Fatalf("Basic のときの current は password: %q", res.Current)
	}
}

func TestAddのエラー対応(t *testing.T) {
	cases := []struct {
		name string
		body string
		err  error
		want int
	}{
		{"追加できる", `{"upn":"x24042xx@aitech.ac.jp"}`, nil, 201},
		{"すでにいる", `{"upn":"x24042xx@aitech.ac.jp"}`, uc.ErrAlreadyAllowed, 409},
		{"形が不正", `{"upn":"nope"}`, derrors.Invalid("bad upn"), 400},
		{"JSON が不正", `{`, nil, 400},
		{"DB エラー", `{"upn":"x24042xx@aitech.ac.jp"}`, context.DeadlineExceeded, 500},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			f := &fakeUC{err: c.err}
			rec := call(router(NewHandler(f)), http.MethodPost, "/v1/admin/allowlist", c.body)
			if rec.Code != c.want {
				t.Fatalf("code=%d want=%d body=%s", rec.Code, c.want, rec.Body)
			}
			if c.want == 201 && f.gotBy != uc.PasswordActor {
				t.Fatalf("Basic のときの added_by: %q", f.gotBy)
			}
		})
	}
}

func TestRemove(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want int
	}{
		{"消せる", nil, 200},
		{"最後の1人", uc.ErrLastAdmin, 409},
		{"自分自身", uc.ErrSelf, 409},
		{"いない", uc.ErrNotFound, 404},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			f := &fakeUC{err: c.err}
			// ブラウザは @ を %40 にして送ることがある
			rec := call(router(NewHandler(f)), http.MethodDelete, "/v1/admin/allowlist/k23099kk%40aitech.ac.jp", "")
			if rec.Code != c.want {
				t.Fatalf("code=%d want=%d", rec.Code, c.want)
			}
			if f.removeUPN != "k23099kk@aitech.ac.jp" {
				t.Fatalf("エスケープを戻せていない: %q", f.removeUPN)
			}
		})
	}
}
