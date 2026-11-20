package middleware

import (
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	chimw "github.com/go-chi/chi/v5/middleware"
)

func TestRedactQueryHidesHRIFromAccessLog(t *testing.T) {
	var buf bytes.Buffer
	chimw.DefaultLogger = chimw.RequestLogger(&chimw.DefaultLogFormatter{Logger: log.New(&buf, "", 0), NoColor: true})
	t.Cleanup(func() {
		chimw.DefaultLogger = chimw.RequestLogger(&chimw.DefaultLogFormatter{Logger: log.New(os.Stderr, "", log.LstdFlags)})
	})

	var got string
	h := RedactQuery("hri")(chimw.Logger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.URL.Query().Get("hri")
	})))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/v1/user?hri=SP7Q2KX9MDRA4TW8YZ", nil))

	if got != "SP7Q2KX9MDRA4TW8YZ" {
		t.Errorf("ハンドラに本物の値が届いていない: %q", got)
	}
	if strings.Contains(buf.String(), "SP7Q2KX9MDRA4TW8YZ") {
		t.Errorf("アクセスログに HRI が残っている: %s", buf.String())
	}
	if !strings.Contains(buf.String(), "hri=REDACTED") {
		t.Errorf("ログに伏せた印が無い: %s", buf.String())
	}
}

func TestRedactQueryLeavesOtherRequests(t *testing.T) {
	var uri string
	h := RedactQuery("hri")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { uri = r.RequestURI }))
	req := httptest.NewRequest(http.MethodGet, "/v1/item?page=2", nil)
	h.ServeHTTP(httptest.NewRecorder(), req)
	if uri != "/v1/item?page=2" {
		t.Errorf("RequestURI = %q", uri)
	}
}
