// Package aitid は、学籍番号と大学のアカウント（UPN）の対応を扱う。
//
// 学籍番号は PoC と同じ形（例: X24042）が本来の形。DB の user.id にはこの先頭に "20" を付けた形（例: 20X24042）で入っている。
// 変換できるのは決まった形のものだけ。形に合わないものは変換せずにエラーにする（一般化しない）。
// システムアカウントだけは例外で、学籍番号を持たないため、定数 SystemAccountUPN として別に扱う。
package aitid

import (
	"errors"
	"regexp"
	"strings"
)

// Domain は大学のアカウントのドメイン
const Domain = "aitech.ac.jp"

// SystemAccountUPN はシス研のシステムアカウント。学籍番号と UPN の変換には混ぜない
const SystemAccountUPN = "sysken@aitech.ac.jp"

// userIDPrefix は DB の user.id で、学籍番号の前に付けている入学年代の接頭辞
const userIDPrefix = "20"

var (
	// ErrInvalidStudentID は学籍番号が決まった形でないことを表す
	ErrInvalidStudentID = errors.New("invalid student id")
	// ErrInvalidUPN は UPN が決まった形でも、システムアカウントでもないことを表す
	ErrInvalidUPN = errors.New("invalid upn")
)

// 学部の文字は PoC に合わせる。学籍番号は「学部の文字 + 2 + 数字4桁」
const majors = "EVCBMPDSALTHKX"

var (
	studentIDPattern = regexp.MustCompile(`^[` + majors + `]2\d{4}$`)
	// UPN は「学籍番号（小文字）+ 学部の文字を 2 つ」@ ドメイン。3 つの学部の文字は同じでなければならない（下で確かめる）
	upnPattern = regexp.MustCompile(`^([` + strings.ToLower(majors) + `])(2\d{4})([` + strings.ToLower(majors) + `])([` + strings.ToLower(majors) + `])@` + regexp.QuoteMeta(Domain) + `$`)
)

// ParseStudentID は学籍番号（例: X24042）を検証して返す。小文字・前後の空白は直す
func ParseStudentID(s string) (string, error) {
	id := strings.ToUpper(strings.TrimSpace(s))
	if !studentIDPattern.MatchString(id) {
		return "", ErrInvalidStudentID
	}
	return id, nil
}

// ToUPN は学籍番号から UPN（小文字）を作る。例: X24042 → x24042xx@aitech.ac.jp
func ToUPN(studentID string) (string, error) {
	id, err := ParseStudentID(studentID)
	if err != nil {
		return "", err
	}
	major := strings.ToLower(id[:1])
	return strings.ToLower(id) + major + major + "@" + Domain, nil
}

// StudentIDFromUPN は UPN から学籍番号を取り出す。
// 決まった形でないとき（システムアカウントを含む）は ok=false。
func StudentIDFromUPN(upn string) (studentID string, ok bool) {
	m := upnPattern.FindStringSubmatch(strings.ToLower(strings.TrimSpace(upn)))
	if m == nil || m[1] != m[3] || m[1] != m[4] {
		return "", false
	}
	return strings.ToUpper(m[1] + m[2]), true
}

// NormalizeUPN は許可リストに入れてよい UPN を、小文字にそろえて返す。
// 入れてよいのは「決まった形の学籍番号の UPN」と「システムアカウント」だけ。
func NormalizeUPN(upn string) (string, error) {
	u := strings.ToLower(strings.TrimSpace(upn))
	if u == SystemAccountUPN {
		return u, nil
	}
	if _, ok := StudentIDFromUPN(u); !ok {
		return "", ErrInvalidUPN
	}
	return u, nil
}

// UserID は学籍番号から、DB の user.id（先頭に 20 を付けた形）を作る。例: X24042 → 20X24042
func UserID(studentID string) (string, error) {
	id, err := ParseStudentID(studentID)
	if err != nil {
		return "", err
	}
	return userIDPrefix + id, nil
}

// StudentIDFromUserID は DB の user.id から学籍番号を取り出す。例: 20X24042 → X24042
// 先頭が 20 でない、または残りが学籍番号の形でないときは ok=false。
func StudentIDFromUserID(userID string) (studentID string, ok bool) {
	rest, found := strings.CutPrefix(userID, userIDPrefix)
	if !found {
		return "", false
	}
	id, err := ParseStudentID(rest)
	if err != nil || id != rest {
		return "", false
	}
	return id, true
}
