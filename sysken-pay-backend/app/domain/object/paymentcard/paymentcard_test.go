package paymentcard

import (
	"errors"
	"strings"
	"testing"

	"sysken-pay-api/app/domain/derrors"
)

func TestGenerateCode_Format(t *testing.T) {
	for i := 0; i < 1000; i++ {
		code, err := GenerateCode()
		if err != nil {
			t.Fatal(err)
		}
		if len(code) != CodeLength {
			t.Fatalf("長さ = %d, want %d (%s)", len(code), CodeLength, code)
		}
		if !strings.HasPrefix(code, Prefix) {
			t.Fatalf("目印 SP で始まらない: %s", code)
		}
		for _, c := range code[len(Prefix):] {
			if !strings.ContainsRune(Alphabet, c) {
				t.Fatalf("使わない文字が入っている: %q in %s", c, code)
			}
		}
		if _, err := NormalizeCode(code); err != nil {
			t.Fatalf("作った文字列が検証を通らない: %s", code)
		}
	}
}

func TestGenerateCode_NoConfusingCharacters(t *testing.T) {
	for _, c := range "01OI" {
		if strings.ContainsRune(Alphabet, c) {
			t.Errorf("見間違えやすい文字 %q が使われている", c)
		}
	}
	if len(Alphabet) != 32 {
		t.Errorf("文字の種類 = %d, want 32", len(Alphabet))
	}
}

func TestGenerateCode_Unique(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 10000; i++ {
		code, err := GenerateCode()
		if err != nil {
			t.Fatal(err)
		}
		if seen[code] {
			t.Fatalf("同じ文字列が2回出た: %s", code)
		}
		seen[code] = true
	}
}

func TestNormalizeCode(t *testing.T) {
	const valid = "SP7Q2KX9MDRA4TW8YZ"
	tests := []struct {
		name  string
		input string
		want  string
		ok    bool
	}{
		{"そのまま", valid, valid, true},
		{"小文字", strings.ToLower(valid), valid, true},
		{"4文字ずつ区切った表示", "SP 7Q2K X9MD RA4T W8YZ", valid, true},
		{"ハイフン区切り", "SP7Q-2KX9-MDRA-4TW8-YZ", valid, true},
		{"末尾の改行（リーダーの Enter）", valid + "\r\n", valid, true},
		{"短い", "SP7Q2KX9", "", false},
		{"長い", valid + "A", "", false},
		{"目印がない", "XX7Q2KX9MDRA4TW8YZ", "", false},
		{"使わない文字 0", "SP0Q2KX9MDRA4TW8YZ", "", false},
		{"使わない文字 O", "SPOQ2KX9MDRA4TW8YZ", "", false},
		{"学籍番号", "24K01234", "", false},
		{"JAN コード", "4901234567894", "", false},
		{"空", "", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NormalizeCode(tt.input)
			if tt.ok {
				if err != nil || got != tt.want {
					t.Fatalf("got (%q, %v), want %q", got, err, tt.want)
				}
				return
			}
			if err == nil {
				t.Fatalf("エラーにならなかった: %q", got)
			}
			if !errors.Is(err, derrors.ErrInvalidInput) {
				t.Errorf("入力不正（400）になっていない: %v", err)
			}
		})
	}
}

func TestLooksLikeCode(t *testing.T) {
	if !LooksLikeCode(" sp7q2kx9 ") {
		t.Error("SP で始まるものは true")
	}
	if LooksLikeCode("4901234567894") {
		t.Error("JAN コードは false")
	}
}

func TestHashCode(t *testing.T) {
	h1 := HashCode("SP7Q2KX9MDRA4TW8YZ")
	h2 := HashCode("SP7Q2KX9MDRA4TW8YA")
	if len(h1) != 64 {
		t.Errorf("SHA-256 の16進は64文字: %d", len(h1))
	}
	if h1 == h2 {
		t.Error("違う文字列は違うハッシュになる")
	}
	if strings.Contains(h1, "SP7Q") {
		t.Error("ハッシュに元の文字列が残っていない")
	}
	if HashCode("SP7Q2KX9MDRA4TW8YZ") != h1 {
		t.Error("同じ文字列は同じハッシュ")
	}
}

func TestDisplayCode(t *testing.T) {
	if got := DisplayCode("SP7Q2KX9MDRA4TW8YZ"); got != "SP 7Q2K X9MD RA4T W8YZ" {
		t.Errorf("got %q", got)
	}
}
