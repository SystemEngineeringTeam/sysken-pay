package config

import (
	"reflect"
	"testing"
)

func TestAllowedOrigins(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "")
	if got := AllowedOrigins(); !reflect.DeepEqual(got, defaultAllowedOrigins) {
		t.Errorf("未設定: got %v", got)
	}

	t.Setenv("ALLOWED_ORIGINS", " http://localhost:3000 , http://192.168.0.10:3000,, ")
	want := []string{"http://localhost:3000", "http://192.168.0.10:3000"}
	if got := AllowedOrigins(); !reflect.DeepEqual(got, want) {
		t.Errorf("カンマ区切り: got %v, want %v", got, want)
	}
}

func TestAdminUser(t *testing.T) {
	t.Setenv("ADMIN_USER", "")
	if got := AdminUser(); got != "admin" {
		t.Errorf("未設定: got %q", got)
	}
	t.Setenv("ADMIN_USER", "kaikei")
	if got := AdminUser(); got != "kaikei" {
		t.Errorf("設定あり: got %q", got)
	}
}

func TestPublicBaseURL(t *testing.T) {
	t.Setenv("PUBLIC_BASE_URL", "")
	if got := PublicBaseURL(); got != "" {
		t.Errorf("未設定: got %q", got)
	}
	t.Setenv("PUBLIC_BASE_URL", " http://192.0.2.10:8081/ ")
	if got := PublicBaseURL(); got != "http://192.0.2.10:8081" {
		t.Errorf("前後の空白と末尾の / を取る: got %q", got)
	}
}
