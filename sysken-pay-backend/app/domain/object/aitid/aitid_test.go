package aitid

import "testing"

func TestToUPN(t *testing.T) {
	tests := []struct {
		in      string
		want    string
		wantErr bool
	}{
		{"X24042", "x24042xx@aitech.ac.jp", false},
		{"x24042", "x24042xx@aitech.ac.jp", false}, // 小文字は直す
		{" K23099 ", "k23099kk@aitech.ac.jp", false},
		{"20X24042", "", true}, // DB の形（先頭 20）は学籍番号ではない
		{"Z24042", "", true},   // 知らない学部の文字
		{"X2404", "", true},
		{"X240421", "", true},
		{"X14042", "", true},
		{"", "", true},
		{"sysken", "", true},
	}
	for _, tt := range tests {
		got, err := ToUPN(tt.in)
		if (err != nil) != tt.wantErr || got != tt.want {
			t.Errorf("ToUPN(%q) = %q, %v; want %q (err=%v)", tt.in, got, err, tt.want, tt.wantErr)
		}
	}
}

func TestStudentIDFromUPN(t *testing.T) {
	tests := []struct {
		in     string
		want   string
		wantOK bool
	}{
		{"x24042xx@aitech.ac.jp", "X24042", true},
		{"X24042XX@AITECH.AC.JP", "X24042", true},
		{"k23099kk@aitech.ac.jp", "K23099", true},
		{"x24042kk@aitech.ac.jp", "", false}, // 学部の文字がそろっていない
		{"x24042@aitech.ac.jp", "", false},
		{"x24042xx@example.com", "", false},
		{"x24042xx@aitech.ac.jp.evil.com", "", false},
		{"evil+x24042xx@aitech.ac.jp", "", false},
		{SystemAccountUPN, "", false}, // システムアカウントは学籍番号を持たない
		{"", "", false},
	}
	for _, tt := range tests {
		got, ok := StudentIDFromUPN(tt.in)
		if ok != tt.wantOK || got != tt.want {
			t.Errorf("StudentIDFromUPN(%q) = %q, %v; want %q, %v", tt.in, got, ok, tt.want, tt.wantOK)
		}
	}
}

func TestNormalizeUPN(t *testing.T) {
	tests := []struct {
		in      string
		want    string
		wantErr bool
	}{
		{"X24042XX@aitech.ac.jp", "x24042xx@aitech.ac.jp", false},
		{" Sysken@AITECH.ac.jp ", SystemAccountUPN, false},
		{"admin@aitech.ac.jp", "", true}, // 決まった形でも、システムアカウントでもない
		{"sysken2@aitech.ac.jp", "", true},
		{"sysken@example.com", "", true},
		{"", "", true},
	}
	for _, tt := range tests {
		got, err := NormalizeUPN(tt.in)
		if (err != nil) != tt.wantErr || got != tt.want {
			t.Errorf("NormalizeUPN(%q) = %q, %v; want %q (err=%v)", tt.in, got, err, tt.want, tt.wantErr)
		}
	}
}

func TestUserIDの往復(t *testing.T) {
	id, err := UserID("x24042")
	if err != nil || id != "20X24042" {
		t.Fatalf("UserID = %q, %v", id, err)
	}
	sid, ok := StudentIDFromUserID(id)
	if !ok || sid != "X24042" {
		t.Fatalf("StudentIDFromUserID = %q, %v", sid, ok)
	}
	for _, bad := range []string{"X24042", "21X24042", "20Z24042", "20x24042", "", "20"} {
		if _, ok := StudentIDFromUserID(bad); ok {
			t.Errorf("StudentIDFromUserID(%q) は失敗するはず", bad)
		}
	}
	if _, err := UserID("bad"); err == nil {
		t.Error("UserID(bad) は失敗するはず")
	}
}
