package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func okHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
}

func TestBasicAuth(t *testing.T) {
	tests := []struct {
		name       string
		password   string // サーバー側の設定
		setAuth    bool
		reqUser    string
		reqPass    string
		wantStatus int
	}{
		{name: "正しいユーザー名とパスワード", password: "secret", setAuth: true, reqUser: "admin", reqPass: "secret", wantStatus: http.StatusOK},
		{name: "ヘッダーなし", password: "secret", setAuth: false, wantStatus: http.StatusUnauthorized},
		{name: "パスワード違い", password: "secret", setAuth: true, reqUser: "admin", reqPass: "wrong", wantStatus: http.StatusUnauthorized},
		{name: "ユーザー名違い", password: "secret", setAuth: true, reqUser: "root", reqPass: "secret", wantStatus: http.StatusUnauthorized},
		{name: "前方一致では通らない", password: "secret", setAuth: true, reqUser: "admin", reqPass: "secretX", wantStatus: http.StatusUnauthorized},
		{name: "サーバーのパスワード未設定なら空パスワードでも拒否", password: "", setAuth: true, reqUser: "admin", reqPass: "", wantStatus: http.StatusUnauthorized},
		{name: "サーバーのパスワード未設定ならヘッダーなしも拒否", password: "", setAuth: false, wantStatus: http.StatusUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := BasicAuth("admin", tt.password)(okHandler())
			req := httptest.NewRequest(http.MethodPost, "/v1/item", nil)
			if tt.setAuth {
				req.SetBasicAuth(tt.reqUser, tt.reqPass)
			}
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if rec.Code == http.StatusUnauthorized && rec.Header().Get("WWW-Authenticate") != "" {
				t.Fatalf("WWW-Authenticate を返すとブラウザのログイン画面が出てしまう")
			}
		})
	}
}

func TestVerify(t *testing.T) {
	rec := httptest.NewRecorder()
	Verify(rec, httptest.NewRequest(http.MethodGet, "/v1/admin/verify", nil))
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
}

func TestBasicAuthAny(t *testing.T) {
	h := BasicAuthAny("admin", "a-pass", "", "c-pass")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	check := func(user, pass string, want int) {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.SetBasicAuth(user, pass)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != want {
			t.Errorf("%s/%q: status = %d, want %d", user, pass, rec.Code, want)
		}
	}
	check("admin", "a-pass", http.StatusNoContent)
	check("admin", "c-pass", http.StatusNoContent)
	check("admin", "", http.StatusUnauthorized) // 空のパスワードは使わない
	check("admin", "wrong", http.StatusUnauthorized)
	check("other", "a-pass", http.StatusUnauthorized)
}
