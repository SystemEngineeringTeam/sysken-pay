package paymentcard

import (
	"bytes"
	"errors"
	"testing"

	"sysken-pay-api/app/domain/derrors"
)

func TestClaimToken(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 1000; i++ {
		tok, err := GenerateClaimToken()
		if err != nil {
			t.Fatal(err)
		}
		if len(tok) != 43 {
			t.Fatalf("長さ = %d, want 43", len(tok))
		}
		if err := ValidateClaimToken(tok); err != nil {
			t.Fatalf("作ったトークンが検証を通らない: %v", err)
		}
		if seen[tok] {
			t.Fatal("同じトークンが2回出た")
		}
		seen[tok] = true
	}
	for _, bad := range []string{"", "abc", "SP7Q2KX9MDRA4TW8YZ", "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"} {
		if err := ValidateClaimToken(bad); !errors.Is(err, derrors.ErrInvalidInput) {
			t.Errorf("%q: err = %v, want 入力不正", bad, err)
		}
	}
}

func TestSealOpen(t *testing.T) {
	tok, _ := GenerateClaimToken()
	code, _ := GenerateCode()

	sealed, err := SealCode(tok, code)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(sealed, []byte(code)) {
		t.Fatal("暗号文に元の文字列が見えている")
	}

	got, err := OpenCode(tok, sealed)
	if err != nil || got != code {
		t.Fatalf("元に戻せない: got %q, err %v", got, err)
	}

	// 同じ中身でも毎回違う暗号文になる
	sealed2, _ := SealCode(tok, code)
	if bytes.Equal(sealed, sealed2) {
		t.Error("同じ暗号文になった（nonce が使い回されている）")
	}
}

func TestOpen_WrongTokenOrTampered(t *testing.T) {
	tok, _ := GenerateClaimToken()
	other, _ := GenerateClaimToken()
	code, _ := GenerateCode()
	sealed, _ := SealCode(tok, code)

	if _, err := OpenCode(other, sealed); !errors.Is(err, ErrClaimDecrypt) {
		t.Errorf("別のトークンで開けてしまう: %v", err)
	}

	tampered := append([]byte{}, sealed...)
	tampered[len(tampered)-1] ^= 1
	if _, err := OpenCode(tok, tampered); !errors.Is(err, ErrClaimDecrypt) {
		t.Errorf("書き換えられた暗号文を開けてしまう: %v", err)
	}

	if _, err := OpenCode(tok, []byte{1, 2}); !errors.Is(err, ErrClaimDecrypt) {
		t.Errorf("短すぎる暗号文で: %v", err)
	}
}

func TestHashClaimToken(t *testing.T) {
	tok, _ := GenerateClaimToken()
	h := HashClaimToken(tok)
	if len(h) != 64 || h == tok {
		t.Errorf("hash = %q", h)
	}
}
