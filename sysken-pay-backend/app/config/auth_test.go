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

func TestEntra設定(t *testing.T) {
	t.Setenv("ENTRA_TENANT_ID", "")
	t.Setenv("ENTRA_CLIENT_ID", "")
	if EntraTenantID() != "" || EntraClientID() != "" {
		t.Error("未設定は空のはず")
	}
	t.Setenv("ENTRA_TENANT_ID", " tenant-1 ")
	t.Setenv("ENTRA_CLIENT_ID", "client-1\n")
	if got := EntraTenantID(); got != "tenant-1" {
		t.Errorf("tenant: %q", got)
	}
	if got := EntraClientID(); got != "client-1" {
		t.Errorf("client: %q", got)
	}
}
