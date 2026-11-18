package member

import (
	"testing"
	"time"
)

func at(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return t
}

func TestFiscalYear(t *testing.T) {
	tests := map[string]int{
		"2026-11-19T12:00:00+09:00": 2026,
		"2027-03-31T23:59:59+09:00": 2026,
		"2027-04-01T00:00:00+09:00": 2027,
		// UTC ではまだ3月31日でも、日本では4月1日
		"2027-03-31T15:00:00Z": 2027,
	}
	for in, want := range tests {
		if got := FiscalYear(at(in)); got != want {
			t.Errorf("FiscalYear(%s) = %d, want %d", in, got, want)
		}
	}
}

func TestEntranceYear(t *testing.T) {
	if y, ok := EntranceYear("20X24042"); !ok || y != 2024 {
		t.Errorf("got %d %v", y, ok)
	}
	for _, id := range []string{"", "2", "K2", "20X2", "20X2A042", "2020X4042", "XXX24042"} {
		if _, ok := EntranceYear(id); ok {
			t.Errorf("%q: ok になった", id)
		}
	}
}

func TestGraduationCandidate(t *testing.T) {
	now := at("2026-11-19T12:00:00+09:00") // 2026年度
	stopped := now
	tests := []struct {
		name string
		s    Summary
		want bool
	}{
		{"入学から4年（22）は候補", Summary{UserID: "20K22099"}, true},
		{"5年以上（21）も候補（留年など）", Summary{UserID: "20K21099"}, true},
		{"3年（23）は候補ではない", Summary{UserID: "20K23099"}, false},
		{"先頭2桁（20）は見ない", Summary{UserID: "20X24042"}, false},
		{"止めた人は候補ではない", Summary{UserID: "20K22099", StoppedAt: &stopped}, false},
	}
	for _, tt := range tests {
		if got := tt.s.GraduationCandidate(now); got != tt.want {
			t.Errorf("%s: got %v", tt.name, got)
		}
	}
}

func TestUnrefunded(t *testing.T) {
	stopped := time.Now()
	if !(&Summary{Balance: 100, StoppedAt: &stopped}).Unrefunded() {
		t.Error("止めて残高がある人は未返金")
	}
	if (&Summary{Balance: 0, StoppedAt: &stopped}).Unrefunded() {
		t.Error("残高0は未返金ではない")
	}
	if (&Summary{Balance: 100}).Unrefunded() {
		t.Error("使える人は未返金ではない")
	}
}
