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
		{http.MethodGet, "/claim", http.StatusOK, "text/html"},
		{http.MethodGet, "/claim/app.js", http.StatusOK, "text/javascript"},
		{http.MethodGet, "/claim/app.css", http.StatusOK, "text/css"},
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

func TestClaimPageHasNoInlineScript(t *testing.T) {
	// CSP で script-src 'self' にしているので、HTML の中に直接スクリプトを書くと動かない
	rec := httptest.NewRecorder()
	newClaimRouter(&fakeClaimOpen{}, time.Second).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/claim", nil))
	body := rec.Body.String()
	if strings.Count(body, "<script") != 1 || !strings.Contains(body, `<script src="/claim/app.js"></script>`) {
		t.Error("インラインのスクリプトがある、または app.js を読み込んでいない")
	}
	if strings.Contains(body, " style=") || strings.Contains(body, "onclick") {
		t.Error("インラインの style / イベントがある（CSP で動かない）")
	}
}
