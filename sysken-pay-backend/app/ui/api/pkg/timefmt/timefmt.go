package timefmt

import "time"

var jst = time.FixedZone("JST", 9*60*60)

// JST formats t in JST (Asia/Tokyo, +09:00) with millisecond precision.
// 例: 2025-01-01T09:00:00.000+09:00
func JST(t time.Time) string {
	return t.In(jst).Format("2006-01-02T15:04:05.000-07:00")
}
