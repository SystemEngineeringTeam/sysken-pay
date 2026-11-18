// Package member は管理者画面の「ユーザー一覧」と、退部・卒業のとき（返金・利用停止）に使う部員の情報。
// 設計は docs/phone-payment.md の「退部・卒業」を参照。
package member

import (
	"strconv"
	"time"
)

// Status は部員の状態
type Status string

const (
	// StatusActive は使える状態
	StatusActive Status = "active"
	// StatusStopped は利用停止した状態（user.deleted_at が入っている）
	StatusStopped Status = "stopped"
)

// GraduationYears は卒業候補にする、入学からの年数（学部4年）
const GraduationYears = 4

// jst は年度の区切り（4月1日）を日本の時刻で判断するためのタイムゾーン
var jst = time.FixedZone("Asia/Tokyo", 9*60*60)

// Summary はユーザー一覧の1行
type Summary struct {
	UserID   string
	UserName string
	Balance  int
	// StoppedAt は利用停止した日時。使える状態なら nil
	StoppedAt *time.Time
	// HasPaymentCard は使える支払い用バーコードがあるか
	HasPaymentCard bool
	// Hidden は一覧から非表示にした人か（利用停止した人だけがなれる）
	Hidden bool
	// HasHistory は購入・チャージ・返金の記録が1件でもあるか（あれば削除できない）
	HasHistory bool
}

// Status は部員の状態を返す
func (s *Summary) Status() Status {
	if s.StoppedAt != nil {
		return StatusStopped
	}
	return StatusActive
}

// Deletable は削除できる人か（停止中で、購入・チャージ・返金の記録が1件もない）
func (s *Summary) Deletable() bool {
	return s.Status() == StatusStopped && !s.HasHistory
}

// Unrefunded は「止めたのに残高が残っている（まだ返金していない）」人か
func (s *Summary) Unrefunded() bool {
	return s.Status() == StatusStopped && s.Balance > 0
}

// GraduationCandidate は年度末の卒業候補か（使える状態で、入学から GraduationYears 年以上たった人）。
// 留年・大学院進学の人も入るので、これで自動では止めない。役員がチェックを付けたものだけ止める
func (s *Summary) GraduationCandidate(now time.Time) bool {
	if s.Status() != StatusActive {
		return false
	}
	year, ok := EntranceYear(s.UserID)
	if !ok {
		return false
	}
	return FiscalYear(now)-year >= GraduationYears
}

// EntranceYear は学籍番号のアルファベットの後ろの2桁から入学年度（西暦）を返す。例: 20X24042 → 2024
// （先頭2桁は全員同じなので使わない）
func EntranceYear(userID string) (int, bool) {
	// 形式: 数字2桁 + アルファベット1文字 + 数字の連番（先頭2桁が入学年度）
	if len(userID) < 5 {
		return 0, false
	}
	for _, i := range []int{0, 1, 3, 4} {
		if userID[i] < '0' || userID[i] > '9' {
			return 0, false
		}
	}
	c := userID[2]
	if !(c >= 'A' && c <= 'Z') && !(c >= 'a' && c <= 'z') {
		return 0, false
	}
	yy, _ := strconv.Atoi(userID[3:5])
	return 2000 + yy, true
}

// FiscalYear は年度（4月始まり）を返す。例: 2027年3月 → 2026
func FiscalYear(now time.Time) int {
	t := now.In(jst)
	if t.Month() < time.April {
		return t.Year() - 1
	}
	return t.Year()
}
