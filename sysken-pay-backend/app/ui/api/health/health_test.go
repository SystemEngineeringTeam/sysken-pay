package health

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakePinger struct {
	err error
	// gotDeadline は、Ping に時間制限つきの ctx が渡されたかを記録する
	gotDeadline bool
}

func (f *fakePinger) PingContext(ctx context.Context) error {
	_, f.gotDeadline = ctx.Deadline()
	return f.err
}

func call(p Pinger) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	NewCheck(p)(rec, httptest.NewRequest(http.MethodGet, "/v1/health", nil))
	return rec
}

func TestCheckOK(t *testing.T) {
	p := &fakePinger{}
	rec := call(p)
	if rec.Code != http.StatusOK || rec.Body.String() != "OK" {
		t.Fatalf("got %d %q, want 200 OK", rec.Code, rec.Body.String())
	}
	if !p.gotDeadline {
		t.Error("Ping に時間制限（タイムアウト）が付いていない")
	}
}

func TestCheckDBDown(t *testing.T) {
	rec := call(&fakePinger{err: errors.New("dial tcp 10.0.0.5:3306: connection refused")})
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rec.Code)
	}
	// DB のエラーの中身（接続先など）を外に出さない
	if rec.Body.String() != "NG" {
		t.Errorf("body = %q, want NG（エラーの中身を出さない）", rec.Body.String())
	}
}
