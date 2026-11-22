package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	apimw "sysken-pay-api/app/ui/api/middleware"
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
func (stub) DisableItem(w http.ResponseWriter, r *http.Request)          { ok(w, r) }
func (stub) EnableItem(w http.ResponseWriter, r *http.Request)           { ok(w, r) }
func (stub) ChargeAmount(w http.ResponseWriter, r *http.Request)         { ok(w, r) }
func (stub) ChargeCancel(w http.ResponseWriter, r *http.Request)         { ok(w, r) }
func (stub) CreatePurchase(w http.ResponseWriter, r *http.Request)       { ok(w, r) }
func (stub) CancelPurchase(w http.ResponseWriter, r *http.Request)       { ok(w, r) }
func (stub) GetBalance(w http.ResponseWriter, r *http.Request)           { ok(w, r) }
func (stub) GetPurchaseHistories(w http.ResponseWriter, r *http.Request) { ok(w, r) }
func (stub) Issue(w http.ResponseWriter, r *http.Request)                { ok(w, r) }
func (stub) Resolve(w http.ResponseWriter, r *http.Request)              { ok(w, r) }
func (stub) Create(w http.ResponseWriter, r *http.Request)               { ok(w, r) }
func (stub) Status(w http.ResponseWriter, r *http.Request)               { ok(w, r) }
func (stub) List(w http.ResponseWriter, r *http.Request)                 { ok(w, r) }
func (stub) Refund(w http.ResponseWriter, r *http.Request)               { ok(w, r) }
func (stub) Stop(w http.ResponseWriter, r *http.Request)                 { ok(w, r) }
func (stub) Resume(w http.ResponseWriter, r *http.Request)               { ok(w, r) }
func (stub) Hide(w http.ResponseWriter, r *http.Request)                 { ok(w, r) }
func (stub) Unhide(w http.ResponseWriter, r *http.Request)               { ok(w, r) }
func (stub) Delete(w http.ResponseWriter, r *http.Request)               { ok(w, r) }
func (stub) ListAllowed(w http.ResponseWriter, r *http.Request)          { ok(w, r) }
func (stub) AddAllowed(w http.ResponseWriter, r *http.Request)           { ok(w, r) }
func (stub) Unlock(w http.ResponseWriter, r *http.Request)               { ok(w, r) }
func (stub) Lock(w http.ResponseWriter, r *http.Request)                 { ok(w, r) }
func (stub) RemoveAllowed(w http.ResponseWriter, r *http.Request)        { ok(w, r) }

// testSessions はテスト用の解除トークンの置き場（router_test のルーターが共有する）
var testSessions = apimw.NewSessionStore()

func testRouter(password string) http.Handler {
	return testRouterWithCharge(password, "")
}

func testRouterWithCharge(password, chargePassword string) http.Handler {
	return testRouterWithEntra(password, chargePassword, nil, nil)
}

func testRouterWithEntra(password, chargePassword string, entra apimw.TokenVerifier, allow apimw.AllowChecker) http.Handler {
	s := stub{}
	return newRouter(
		handlers{user: s, item: s, charge: s, purchase: s, balance: s, paymentCard: s, member: s, adminAllow: s, adminUnlock: s, health: ok},
		routerConfig{
			adminUser:      "admin",
			adminPassword:  password,
			chargePassword: chargePassword,
			allowedOrigins: []string{"http://localhost:3000"},
			timeout:        time.Second,
			entra:          entra,
			adminAllowlist: allow,
			sessions:       testSessions,
		},
	)
}

var protectedRoutes = []struct{ method, path string }{
	{http.MethodGet, "/v1/admin/verify"},
	{http.MethodGet, "/v1/admin/allowlist"},
	{http.MethodPost, "/v1/admin/allowlist"},
	{http.MethodDelete, "/v1/admin/allowlist/k23099kk@aitech.ac.jp"},
	{http.MethodPost, "/v1/user"},
	{http.MethodPatch, "/v1/user/20K23099"},
	{http.MethodPost, "/v1/user/20K23099/charge/cancel"},
	{http.MethodPost, "/v1/user/20K23099/purchase/cancel"},
	{http.MethodPost, "/v1/item"},
	{http.MethodPatch, "/v1/item"},
	{http.MethodPost, "/v1/item/4901234567894/disable"},
	{http.MethodPost, "/v1/item/4901234567894/enable"},
	{http.MethodPost, "/v1/user/20K23099/hri"},
	{http.MethodGet, "/v1/user"},
	{http.MethodPost, "/v1/user/20K23099/refund"},
	{http.MethodPost, "/v1/user/20K23099/stop"},
	{http.MethodPost, "/v1/user/20K23099/resume"},
	{http.MethodPost, "/v1/user/20K23099/hide"},
	{http.MethodPost, "/v1/user/20K23099/unhide"},
	{http.MethodDelete, "/v1/user/20K23099"},
}

var openRoutes = []struct{ method, path string }{
	{http.MethodGet, "/v1/user/20K23099"},
	{http.MethodGet, "/v1/user/20K23099/balance"},
	{http.MethodGet, "/v1/user/20K23099/history"},
	{http.MethodPost, "/v1/user/20K23099/purchase"},
	{http.MethodGet, "/v1/item"},
	{http.MethodGet, "/v1/item/4901234567894"},
	{http.MethodGet, "/v1/health"},
	// HRI（SP…）の持ち主を調べる。hri が付いていれば認証なし（付いていない GET /v1/user は管理者のみ）
	{http.MethodGet, "/v1/user?hri=SP7Q2KX9MDRA4TW8YZ"},
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

// チャージだけは、チャージ用パスワードでも管理者パスワードでも通る
var chargeRoutes = []struct{ method, path string }{
	{http.MethodGet, "/v1/charge/verify"},
	{http.MethodPost, "/v1/user/20K23099/charge"},
}

func TestChargePassword(t *testing.T) {
	h := testRouterWithCharge("admin-pass", "charge-pass")
	for _, rt := range chargeRoutes {
		for _, pass := range []string{"charge-pass", "admin-pass"} {
			if got := do(h, rt.method, rt.path, true, pass); got == http.StatusUnauthorized || got == http.StatusNotFound {
				t.Errorf("%s %s を %s で: status = %d, want 2xx", rt.method, rt.path, pass, got)
			}
		}
		if got := do(h, rt.method, rt.path, true, "wrong"); got != http.StatusUnauthorized {
			t.Errorf("%s %s パスワード違い: status = %d, want 401", rt.method, rt.path, got)
		}
		if got := do(h, rt.method, rt.path, false, ""); got != http.StatusUnauthorized {
			t.Errorf("%s %s 認証なし: status = %d, want 401", rt.method, rt.path, got)
		}
	}
	// チャージ用パスワードでは、管理者の API には入れない
	for _, rt := range protectedRoutes {
		if got := do(h, rt.method, rt.path, true, "charge-pass"); got != http.StatusUnauthorized {
			t.Errorf("%s %s をチャージ用パスワードで: status = %d, want 401", rt.method, rt.path, got)
		}
	}
}

func TestChargePasswordUnset(t *testing.T) {
	// チャージ用パスワードを書いていないとき：空のパスワードでは入れず、管理者パスワードでは入れる
	h := testRouterWithCharge("admin-pass", "")
	for _, rt := range chargeRoutes {
		if got := do(h, rt.method, rt.path, true, ""); got != http.StatusUnauthorized {
			t.Errorf("%s %s 空のパスワード: status = %d, want 401", rt.method, rt.path, got)
		}
		if got := do(h, rt.method, rt.path, true, "admin-pass"); got == http.StatusUnauthorized {
			t.Errorf("%s %s 管理者パスワード: status = %d", rt.method, rt.path, got)
		}
	}
	// どちらも書いていないときは、チャージもすべて拒否
	h = testRouterWithCharge("", "")
	for _, rt := range chargeRoutes {
		if got := do(h, rt.method, rt.path, true, ""); got != http.StatusUnauthorized {
			t.Errorf("%s %s 両方未設定: status = %d, want 401", rt.method, rt.path, got)
		}
	}
}

// --- Entra（Bearer）---

type fakeVerifier map[string]string // トークン → UPN

func (f fakeVerifier) Verify(_ context.Context, raw string) (string, error) {
	if upn, ok := f[raw]; ok {
		return upn, nil
	}
	return "", apimw.ErrInvalidToken
}

type fakeAllow map[string]bool

func (f fakeAllow) Exists(_ context.Context, upn string) (bool, error) { return f[upn], nil }

func doBearer(h http.Handler, method, path, token string) int {
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Code
}

// 管理者の API は、許可リストにいる人の Bearer でも同じように通り、いない人・不正なトークンは通らない
func TestProtectedRoutesWithBearer(t *testing.T) {
	h := testRouterWithEntra("secret", "charge-pass",
		fakeVerifier{"good": "x24042xx@aitech.ac.jp", "stranger": "k23099kk@aitech.ac.jp"},
		fakeAllow{"x24042xx@aitech.ac.jp": true})
	for _, rt := range protectedRoutes {
		if got := doBearer(h, rt.method, rt.path, "good"); got == http.StatusUnauthorized || got == http.StatusForbidden || got == http.StatusNotFound {
			t.Errorf("%s %s 許可済みの Bearer: status = %d, want 2xx", rt.method, rt.path, got)
		}
		if got := doBearer(h, rt.method, rt.path, "stranger"); got != http.StatusForbidden {
			t.Errorf("%s %s 許可リスト外: status = %d, want 403", rt.method, rt.path, got)
		}
		if got := doBearer(h, rt.method, rt.path, "forged"); got != http.StatusUnauthorized {
			t.Errorf("%s %s 不正なトークン: status = %d, want 401", rt.method, rt.path, got)
		}
		// 予備のパスワードは、Entra を設定していても今まで通り通る
		if got := do(h, rt.method, rt.path, true, "secret"); got == http.StatusUnauthorized {
			t.Errorf("%s %s パスワード: status = %d, want 2xx", rt.method, rt.path, got)
		}
	}
}

// Entra が未設定なら、Bearer はどの API でも拒否される
func TestBearerRejectedWhenEntraUnset(t *testing.T) {
	h := testRouter("secret")
	for _, rt := range protectedRoutes {
		if got := doBearer(h, rt.method, rt.path, "anything"); got != http.StatusUnauthorized {
			t.Errorf("%s %s Entra 未設定: status = %d, want 401", rt.method, rt.path, got)
		}
	}
}

// チャージ用の API（ラズパイ）は Bearer では入れない（Entra は PC の管理サイトだけ）
func TestChargeRoutesIgnoreBearer(t *testing.T) {
	h := testRouterWithEntra("secret", "charge-pass",
		fakeVerifier{"good": "x24042xx@aitech.ac.jp"}, fakeAllow{"x24042xx@aitech.ac.jp": true})
	for _, rt := range chargeRoutes {
		if got := doBearer(h, rt.method, rt.path, "good"); got != http.StatusUnauthorized {
			t.Errorf("%s %s Bearer: status = %d, want 401", rt.method, rt.path, got)
		}
	}
}

// --- 管理者バーコードで解除した Session ---

func doSession(h http.Handler, method, path, token string) int {
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set("Authorization", "Session "+token)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Code
}

// 解除した Session は、管理者の API とチャージの API に通る。ただし許可リストの編集（権限を増やす操作）は通さない
// Session では通さない操作: 許可リストの編集、ユーザーの更新・削除・停止・再開・非表示・返金
func sessionDenied(method, path string) bool {
	if strings.HasPrefix(path, "/v1/admin/allowlist") {
		return true
	}
	if method == http.MethodPatch && strings.HasPrefix(path, "/v1/user/") {
		return true
	}
	if method == http.MethodDelete && strings.HasPrefix(path, "/v1/user/") {
		return true
	}
	for _, suffix := range []string{"/refund", "/stop", "/resume", "/hide", "/unhide"} {
		if method == http.MethodPost && strings.HasSuffix(path, suffix) {
			return true
		}
	}
	return false
}

func TestSessionRoutes(t *testing.T) {
	h := testRouterWithCharge("secret", "charge-pass")
	tok, err := testSessions.Issue()
	if err != nil {
		t.Fatal(err)
	}
	for _, rt := range protectedRoutes {
		got := doSession(h, rt.method, rt.path, tok)
		if sessionDenied(rt.method, rt.path) {
			if got != http.StatusUnauthorized {
				t.Errorf("%s %s Session で通ってはいけない: status = %d, want 401", rt.method, rt.path, got)
			}
			continue
		}
		if got == http.StatusUnauthorized || got == http.StatusNotFound || got == http.StatusMethodNotAllowed {
			t.Errorf("%s %s Session: status = %d, want 2xx", rt.method, rt.path, got)
		}
	}
	for _, rt := range chargeRoutes {
		if got := doSession(h, rt.method, rt.path, tok); got == http.StatusUnauthorized || got == http.StatusNotFound {
			t.Errorf("%s %s Session: status = %d, want 2xx", rt.method, rt.path, got)
		}
	}
}

func TestSessionRoutesRejectInvalidOrRevoked(t *testing.T) {
	h := testRouterWithCharge("secret", "charge-pass")
	all := append(append([]struct{ method, path string }{}, protectedRoutes...), chargeRoutes...)
	for _, rt := range all {
		if got := doSession(h, rt.method, rt.path, "forged"); got != http.StatusUnauthorized {
			t.Errorf("%s %s 不正な Session: status = %d, want 401", rt.method, rt.path, got)
		}
	}
	tok, _ := testSessions.Issue()
	testSessions.Revoke(tok)
	if got := doSession(h, http.MethodGet, "/v1/admin/verify", tok); got != http.StatusUnauthorized {
		t.Errorf("取り消した Session: status = %d, want 401", got)
	}
}

// 解除の入口は認証なし（バーコードそのものが認証）。パスワード・Session がなくても届く
func TestUnlockRouteIsOpen(t *testing.T) {
	h := testRouter("secret")
	for _, method := range []string{http.MethodPost, http.MethodDelete} {
		if got := do(h, method, "/v1/admin/unlock", false, ""); got != http.StatusOK {
			t.Errorf("%s /v1/admin/unlock: status = %d, want 200", method, got)
		}
	}
}
