package paymentcard

import (
	"sync"
	"time"
)

// failureLimiter は照合の失敗が短い時間に続いたら、しばらく受け付けないようにする（当てずっぽうの入力対策）。
//
// 端末は部室の1台だけで、API はラズパイの中からしか届かないので、相手ごとではなく全体で数える。
// 正しい支払い用バーコードは 32^16 通りあるので当たることはまずないが、念のため入れておく。
type failureLimiter struct {
	mu        sync.Mutex
	max       int           // window の間に許す失敗の回数
	window    time.Duration // 失敗を数える時間
	blockFor  time.Duration // 超えたら受け付けない時間
	now       func() time.Time
	failures  []time.Time
	blockedTo time.Time
}

func newFailureLimiter(max int, window, blockFor time.Duration) *failureLimiter {
	return &failureLimiter{max: max, window: window, blockFor: blockFor, now: time.Now}
}

// Blocked は今受け付けない状態かを返す
func (l *failureLimiter) Blocked() bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.now().Before(l.blockedTo)
}

// Fail は失敗を1回記録する。回数を超えたら受け付けない状態にする
func (l *failureLimiter) Fail() {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	kept := l.failures[:0]
	for _, t := range l.failures {
		if now.Sub(t) < l.window {
			kept = append(kept, t)
		}
	}
	l.failures = append(kept, now)
	if len(l.failures) >= l.max {
		l.blockedTo = now.Add(l.blockFor)
		l.failures = l.failures[:0]
	}
}
