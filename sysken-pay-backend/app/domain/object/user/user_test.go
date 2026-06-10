package user

import (
	"strings"
	"testing"
)

// --- SetUserID ---

func TestSetUserID_Valid(t *testing.T) {
	u := &User{}
	if err := u.SetUserID("20K23099"); err != nil {
		t.Errorf("SetUserID should succeed: %v", err)
	}
}

func TestSetUserID_Empty(t *testing.T) {
	u := &User{}
	if err := u.SetUserID(""); err == nil {
		t.Error("SetUserID empty should fail")
	}
}

func TestSetUserID_Exactly20Chars(t *testing.T) {
	u := &User{}
	// 学籍番号フォーマットで20文字 (2桁数字 + 1文字 + 17桁数字)
	id := "20K" + strings.Repeat("1", 17)
	if err := u.SetUserID(id); err != nil {
		t.Errorf("SetUserID 20 chars should succeed: %v", err)
	}
}

func TestSetUserID_Over20Chars(t *testing.T) {
	u := &User{}
	id := "20K" + strings.Repeat("1", 18) // 21 chars
	if err := u.SetUserID(id); err == nil {
		t.Error("SetUserID 21 chars should fail")
	}
}

func TestSetUserID_InvalidFormat(t *testing.T) {
	u := &User{}
	cases := []string{
		"abcdef",              // アルファベットのみ
		"user123",             // 数字2桁スタートでない
		"123",                 // 全数字
		"20K",                 // 末尾の数字なし
		"20KK23099",           // アルファベット2文字
		"K20K23099",           // 先頭が数字でない
		"2-K23099",            // 記号混入
		strings.Repeat("あ", 8), // マルチバイトはフォーマット違反
	}
	for _, id := range cases {
		if err := u.SetUserID(id); err == nil {
			t.Errorf("SetUserID(%q) should fail format validation", id)
		}
	}
}

// --- SetUserName ---

func TestSetUserName_Valid(t *testing.T) {
	u := &User{}
	if err := u.SetUserName("田中 太郎"); err != nil {
		t.Errorf("SetUserName should succeed: %v", err)
	}
}

func TestSetUserName_Empty(t *testing.T) {
	u := &User{}
	if err := u.SetUserName(""); err == nil {
		t.Error("SetUserName empty should fail")
	}
}

func TestSetUserName_Exactly50Chars(t *testing.T) {
	u := &User{}
	name := strings.Repeat("a", 50)
	if err := u.SetUserName(name); err != nil {
		t.Errorf("SetUserName 50 chars should succeed: %v", err)
	}
}

func TestSetUserName_Over50Chars(t *testing.T) {
	u := &User{}
	name := strings.Repeat("a", 51)
	if err := u.SetUserName(name); err == nil {
		t.Error("SetUserName 51 chars should fail")
	}
}

func TestSetUserName_MultibyteCounts(t *testing.T) {
	u := &User{}
	name50 := strings.Repeat("あ", 50)
	if err := u.SetUserName(name50); err != nil {
		t.Errorf("SetUserName 50 multibyte chars should succeed: %v", err)
	}
	name51 := strings.Repeat("あ", 51)
	if err := u.SetUserName(name51); err == nil {
		t.Error("SetUserName 51 multibyte chars should fail")
	}
}

// --- NewUser ---

func TestNewUser_Valid(t *testing.T) {
	u, err := NewUser("20K23099", "田中 太郎")
	if err != nil {
		t.Fatalf("NewUser should succeed: %v", err)
	}
	if u.ID() != "20K23099" {
		t.Errorf("ID() = %s, want 20K23099", u.ID())
	}
	if u.UserName() != "田中 太郎" {
		t.Errorf("UserName() = %s, want 田中 太郎", u.UserName())
	}
}

func TestNewUser_EmptyUserID(t *testing.T) {
	if _, err := NewUser("", "田中 太郎"); err == nil {
		t.Error("NewUser empty userID should fail")
	}
}

func TestNewUser_EmptyUserName(t *testing.T) {
	if _, err := NewUser("20K23099", ""); err == nil {
		t.Error("NewUser empty userName should fail")
	}
}

func TestNewUser_UserIDTooLong(t *testing.T) {
	id := "20K" + strings.Repeat("1", 18) // 21 chars
	if _, err := NewUser(id, "田中 太郎"); err == nil {
		t.Error("NewUser userID > 20 chars should fail")
	}
}

func TestNewUser_UserNameTooLong(t *testing.T) {
	if _, err := NewUser("20K23099", strings.Repeat("a", 51)); err == nil {
		t.Error("NewUser userName > 50 chars should fail")
	}
}
