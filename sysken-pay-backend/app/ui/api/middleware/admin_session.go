package middleware

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"strings"
	"sync"
	"time"

	apierrors "sysken-pay-api/app/ui/api/pkg/errors"
)

const (
	// SessionIdleTimeout は、使われないまま経つと解除が切れる時間。使うたびに延びる
	SessionIdleTimeout = 10 * time.Minute
	// SessionMaxLifetime は、使い続けても解除が切れる時間（延ばし続けられないようにする）
	SessionMaxLifetime = 1 * time.Hour
	// maxSessions は同時に持つ解除の数の上限（メモリを使い切られないように）
	maxSessions = 16

	sessionScheme = "session "
)

type session struct {
	created  time.Time
	lastUsed time.Time
}

// SessionStore は、管理者バーコードで解除したあとの短い間だけ有効な合言葉（セッショントークン）をメモリに持つ。
//
//   - 保存するのはトークンの SHA-256 だけ。再起動したら全部切れる（再度バーコードをかざす）
//   - ラズパイの API は 1 台だけで動かす前提（複数台にするなら DB に移す）
type SessionStore struct {
	mu       sync.Mutex
	sessions map[[sha256.Size]byte]*session
	now      func() time.Time
}

func NewSessionStore() *SessionStore {
	return &SessionStore{sessions: map[[sha256.Size]byte]*session{}, now: time.Now}
}

// SetClock は現在時刻の取り方を差し替える（テスト用）
func (s *SessionStore) SetClock(now func() time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.now = now
}

// Issue は新しいトークンを発行する。暗号論的乱数 256 ビット
func (s *SessionStore) Issue() (token string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token = base64.RawURLEncoding.EncodeToString(b)
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now()
	s.pruneLocked(now)
	// 上限なら、いちばん古いものを捨てる
	if len(s.sessions) >= maxSessions {
		var oldestKey [sha256.Size]byte
		var oldest time.Time
		first := true
		for k, v := range s.sessions {
			if first || v.created.Before(oldest) {
				oldestKey, oldest, first = k, v.created, false
			}
		}
		delete(s.sessions, oldestKey)
	}
	s.sessions[sha256.Sum256([]byte(token))] = &session{created: now, lastUsed: now}
	return token, nil
}

// Valid はトークンが有効か確かめ、有効なら使った時刻を更新する（アイドルの時間が延びる）
func (s *SessionStore) Valid(token string) bool {
	if token == "" {
		return false
	}
	key := sha256.Sum256([]byte(token))
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now()
	sess, ok := s.sessions[key]
	if !ok {
		return false
	}
	if s.expired(sess, now) {
		delete(s.sessions, key)
		return false
	}
	sess.lastUsed = now
	return true
}

// Revoke はトークンを無効にする（なくても何もしない）
func (s *SessionStore) Revoke(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, sha256.Sum256([]byte(token)))
}

func (s *SessionStore) expired(sess *session, now time.Time) bool {
	return now.Sub(sess.lastUsed) >= SessionIdleTimeout || now.Sub(sess.created) >= SessionMaxLifetime
}

func (s *SessionStore) pruneLocked(now time.Time) {
	for k, v := range s.sessions {
		if s.expired(v, now) {
			delete(s.sessions, k)
		}
	}
}

// SessionToken は "Authorization: Session xxx" の xxx を返す
func SessionToken(r *http.Request) (string, bool) {
	h := r.Header.Get("Authorization")
	if len(h) <= len(sessionScheme) || !strings.EqualFold(h[:len(sessionScheme)], sessionScheme) {
		return "", false
	}
	return strings.TrimSpace(h[len(sessionScheme):]), true
}

// WithSession は、"Authorization: Session xxx" が有効なら通し、それ以外（Bearer・Basic など）は base に回す。
// Session で来て無効なら 401（base には回さない）。store が nil なら Session はすべて拒否する。
func WithSession(store *SessionStore, base func(http.Handler) http.Handler) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		viaBase := base(next)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, ok := SessionToken(r)
			if !ok {
				viaBase.ServeHTTP(w, r)
				return
			}
			if store == nil || !store.Valid(token) {
				apierrors.RespondError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
