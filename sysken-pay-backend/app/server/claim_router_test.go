package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type fakeClaimOpen struct{ called bool }

func (f *fakeClaimOpen) Open(w http.ResponseWriter, _ *http.Request) {
	f.called = true
	w.WriteHeader(http.StatusOK)
}

func TestClaimRouterServesOnlyClaim(t *testing.T) {
	open := &fakeClaimOpen{}
	r := newClaimRouter(open, time.Second)

	tests := []struct {
		method, path string
		want         int
		contentType  string
	}{
		// 受け取りページは別の静的サイトに移したので、この入口では配らない
		{http.MethodGet, "/claim", http.StatusNotFound, ""},
		{http.MethodGet, "/claim/app.js", http.StatusNotFound, ""},
		{http.MethodPost, "/claim/open", http.StatusOK, ""},
		// 既存の API はこの入口からは届かない
		{http.MethodGet, "/v1/health", http.StatusNotFound, ""},
		{http.MethodGet, "/v1/item", http.StatusNotFound, ""},
		{http.MethodPost, "/v1/user/24K01234/purchase", http.StatusNotFound, ""},
		{http.MethodPost, "/v1/payment-card/resolve", http.StatusNotFound, ""},
		{http.MethodGet, "/", http.StatusNotFound, ""},
		// 受け取りは POST だけ（トークンを URL に載せない）
		{http.MethodGet, "/claim/open", http.StatusMethodNotAllowed, ""},
	}
	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, httptest.NewRequest(tt.method, tt.path, nil))
			if rec.Code != tt.want {
				t.Fatalf("status = %d, want %d", rec.Code, tt.want)
			}
			if tt.contentType != "" && !strings.HasPrefix(rec.Header().Get("Content-Type"), tt.contentType) {
				t.Errorf("Content-Type = %q", rec.Header().Get("Content-Type"))
			}
			if !strings.Contains(rec.Header().Get("Content-Security-Policy"), "default-src 'none'") {
				t.Error("CSP が付いていない")
			}
			if rec.Header().Get("Cache-Control") != "no-store" {
				t.Error("Cache-Control: no-store が付いていない")
			}
			if rec.Header().Get("Access-Control-Allow-Origin") != "" {
				t.Error("CORS を許可してしまっている")
			}
		})
	}
}
