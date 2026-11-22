package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestSessionStore(t *testing.T) {
	now := time.Date(2026, 11, 23, 12, 0, 0, 0, time.UTC)
	s := NewSessionStore()
	s.SetClock(func() time.Time { return now })

	tok, err := s.Issue()
	if err != nil || len(tok) < 40 {
		t.Fatalf("tok=%q err=%v", tok, err)
	}
	if !s.Valid(tok) {
		t.Fatal("発行直後は有効のはず")
	}
	if s.Valid("") || s.Valid("other") {
		t.Fatal("知らないトークンが通った")
	}

	// 使うたびにアイドルが延びる
	now = now.Add(SessionIdleTimeout - time.Second)
	if !s.Valid(tok) {
		t.Fatal("アイドルの手前なのに切れた")
	}
	now = now.Add(SessionIdleTimeout - time.Second)
	if !s.Valid(tok) {
		t.Fatal("使って延びたはずなのに切れた")
	}
	// 使わず放置すると切れる
	now = now.Add(SessionIdleTimeout)
	if s.Valid(tok) {
		t.Fatal("アイドルを過ぎても有効")
	}
}

func TestSessionStore_MaxLifetime(t *testing.T) {
	now := time.Date(2026, 11, 23, 12, 0, 0, 0, time.UTC)
	s := NewSessionStore()
	s.SetClock(func() time.Time { return now })
	tok, _ := s.Issue()
	for i := 0; i < 5; i++ { // 9 分おきに使い続ける
		now = now.Add(9 * time.Minute)
		if !s.Valid(tok) {
			t.Fatalf("%d 回目で切れた", i)
		}
	}
	now = now.Add(9 * 8 * time.Minute) // 上限の 1 時間を超える
	for i := 0; i < 8; i++ {
		_ = s.Valid(tok)
	}
	if s.Valid(tok) {
		t.Fatal("使い続けても 1 時間で切れるはず")
	}
}

func TestSessionStore_RevokeAndCap(t *testing.T) {
	s := NewSessionStore()
	tok, _ := s.Issue()
	s.Revoke(tok)
	if s.Valid(tok) {
		t.Fatal("Revoke のあとも有効")
	}
	first, _ := s.Issue()
	now := time.Now()
	s.SetClock(func() time.Time { now = now.Add(time.Second); return now })
	for i := 0; i < maxSessions; i++ {
		if _, err := s.Issue(); err != nil {
			t.Fatal(err)
		}
	}
	if len(s.sessions) > maxSessions {
		t.Fatalf("上限 %d を超えた: %d", maxSessions, len(s.sessions))
	}
	if s.Valid(first) {
		t.Fatal("上限を超えたら古いものから捨てるはず")
	}
}

func TestWithSession(t *testing.T) {
	store := NewSessionStore()
	tok, _ := store.Issue()
	reached := ""
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	base := func(http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			reached = "base"
			w.WriteHeader(http.StatusTeapot)
		})
	}
	do := func(h http.Handler, auth string) int {
		reached = ""
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		if auth != "" {
			req.Header.Set("Authorization", auth)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec.Code
	}
	h := WithSession(store, base)(next)

	if got := do(h, "Session "+tok); got != 200 || reached != "" {
		t.Errorf("有効な Session: %d reached=%q", got, reached)
	}
	if got := do(h, "session "+tok); got != 200 {
		t.Errorf("scheme は大文字小文字を区別しない: %d", got)
	}
	if got := do(h, "Session nope"); got != 401 || reached != "" {
		t.Errorf("無効な Session は base に回さず 401: %d reached=%q", got, reached)
	}
	if got := do(h, "Basic abc"); got != http.StatusTeapot || reached != "base" {
		t.Errorf("Basic は base へ: %d reached=%q", got, reached)
	}
	if got := do(h, ""); reached != "base" {
		t.Errorf("認証なしは base へ: %d", got)
	}
	// store が nil なら Session は全部拒否
	if got := do(WithSession(nil, base)(next), "Session "+tok); got != 401 {
		t.Errorf("store nil: %d", got)
	}
}
