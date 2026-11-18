package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// stub は呼ばれたら 200 を返すだけのハンドラ（全 Handler インターフェースを満たす）
type stub struct{}

func ok(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }

func (stub) GetUser(w http.ResponseWriter, r *http.Request)              { ok(w, r) }
func (stub) RegisterUser(w http.ResponseWriter, r *http.Request)         { ok(w, r) }
func (stub) UpdateUser(w http.ResponseWriter, r *http.Request)           { ok(w, r) }
func (stub) ResisterItem(w http.ResponseWriter, r *http.Request)         { ok(w, r) }
func (stub) UpdateItem(w http.ResponseWriter, r *http.Request)           { ok(w, r) }
func (stub) GetItemByJanCode(w http.ResponseWriter, r *http.Request)     { ok(w, r) }
func (stub) GetAllItems(w http.ResponseWriter, r *http.Request)          { ok(w, r) }
func (stub) ChargeAmount(w http.ResponseWriter, r *http.Request)         { ok(w, r) }
func (stub) ChargeCancel(w http.ResponseWriter, r *http.Request)         { ok(w, r) }
func (stub) CreatePurchase(w http.ResponseWriter, r *http.Request)       { ok(w, r) }
func (stub) CancelPurchase(w http.ResponseWriter, r *http.Request)       { ok(w, r) }
func (stub) GetBalance(w http.ResponseWriter, r *http.Request)           { ok(w, r) }
func (stub) GetPurchaseHistories(w http.ResponseWriter, r *http.Request) { ok(w, r) }
func (stub) Issue(w http.ResponseWriter, r *http.Request)                { ok(w, r) }
func (stub) Resolve(w http.ResponseWriter, r *http.Request)              { ok(w, r) }

func testRouter(password string) http.Handler {
	s := stub{}
	return newRouter(
		handlers{user: s, item: s, charge: s, purchase: s, balance: s, paymentCard: s},
		routerConfig{
			adminUser:      "admin",
			adminPassword:  password,
			allowedOrigins: []string{"http://localhost:3000"},
			timeout:        time.Second,
		},
	)
}

var protectedRoutes = []struct{ method, path string }{
	{http.MethodGet, "/v1/admin/verify"},
	{http.MethodPost, "/v1/user"},
	{http.MethodPatch, "/v1/user/20K23099"},
	{http.MethodPost, "/v1/user/20K23099/charge"},
	{http.MethodPost, "/v1/user/20K23099/charge/cancel"},
	{http.MethodPost, "/v1/user/20K23099/purchase/cancel"},
	{http.MethodPost, "/v1/item"},
	{http.MethodPatch, "/v1/item"},
	{http.MethodPost, "/v1/user/20K23099/payment-card"},
}

var openRoutes = []struct{ method, path string }{
	{http.MethodGet, "/v1/user/20K23099"},
	{http.MethodGet, "/v1/user/20K23099/balance"},
	{http.MethodGet, "/v1/user/20K23099/history"},
	{http.MethodPost, "/v1/user/20K23099/purchase"},
	{http.MethodGet, "/v1/item"},
	{http.MethodGet, "/v1/item/4901234567894"},
	{http.MethodGet, "/v1/health"},
	{http.MethodPost, "/v1/payment-card/resolve"},
}

func do(h http.Handler, method, path string, auth bool, pass string) int {
	req := httptest.NewRequest(method, path, nil)
	if auth {
		req.SetBasicAuth("admin", pass)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Code
}

func TestProtectedRoutesRequireAuth(t *testing.T) {
	h := testRouter("secret")
	for _, rt := range protectedRoutes {
		if got := do(h, rt.method, rt.path, false, ""); got != http.StatusUnauthorized {
			t.Errorf("%s %s 認証なし: status = %d, want 401", rt.method, rt.path, got)
		}
		if got := do(h, rt.method, rt.path, true, "wrong"); got != http.StatusUnauthorized {
			t.Errorf("%s %s パスワード違い: status = %d, want 401", rt.method, rt.path, got)
		}
		got := do(h, rt.method, rt.path, true, "secret")
		if got == http.StatusUnauthorized || got == http.StatusNotFound || got == http.StatusMethodNotAllowed {
			t.Errorf("%s %s 正しいパスワード: status = %d, want 2xx", rt.method, rt.path, got)
		}
	}
}

func TestOpenRoutesDoNotRequireAuth(t *testing.T) {
	h := testRouter("secret")
	for _, rt := range openRoutes {
		if got := do(h, rt.method, rt.path, false, ""); got != http.StatusOK {
			t.Errorf("%s %s 認証なし: status = %d, want 200", rt.method, rt.path, got)
		}
	}
}

func TestProtectedRoutesRejectedWhenPasswordUnset(t *testing.T) {
	h := testRouter("")
	for _, rt := range protectedRoutes {
		if got := do(h, rt.method, rt.path, true, ""); got != http.StatusUnauthorized {
			t.Errorf("%s %s パスワード未設定: status = %d, want 401", rt.method, rt.path, got)
		}
	}
}

func TestCORS(t *testing.T) {
	h := testRouter("secret")

	preflight := func(origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodOptions, "/v1/item", nil)
		req.Header.Set("Origin", origin)
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		req.Header.Set("Access-Control-Request-Headers", "authorization,content-type")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}

	if got := preflight("http://localhost:3000").Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Errorf("許可したオリジン: Access-Control-Allow-Origin = %q", got)
	}
	if got := preflight("http://evil.example.com").Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("許可していないオリジン: Access-Control-Allow-Origin = %q, want empty", got)
	}
}
