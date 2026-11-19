package config

import (
	"os"
	"strings"
)

const (
	adminUserKey      = "ADMIN_USER"
	adminPasswordKey  = "ADMIN_PASSWORD"
	chargePasswordKey = "CHARGE_PASSWORD"
	allowedOriginsKey = "ALLOWED_ORIGINS"
	defaultAdminUser  = "admin"
)

// 開発でよく使うフロントの配信元（pnpm dev / pnpm preview:pi）
var defaultAllowedOrigins = []string{
	"http://localhost:5173",
	"http://localhost:3000",
	"http://127.0.0.1:5173",
	"http://127.0.0.1:3000",
}

// AdminUser は管理系 API の BASIC 認証のユーザー名を返す（未設定なら "admin"）。
func AdminUser() string {
	if v := os.Getenv(adminUserKey); v != "" {
		return v
	}
	return defaultAdminUser
}

// AdminPassword は管理系 API の BASIC 認証のパスワードを返す。
// 未設定のときは空文字を返し、その場合は管理系 API をすべて拒否する。
func AdminPassword() string {
	return os.Getenv(adminPasswordKey)
}

// ChargePassword はチャージの画面のパスワードを返す（管理者パスワードとは別）。
// 未設定のときは空文字を返し、その場合はチャージ用パスワードでは入れない（管理者パスワードでは入れる）。
func ChargePassword() string {
	return os.Getenv(chargePasswordKey)
}

// AllowedOrigins は CORS で許可するオリジンを返す。
// ALLOWED_ORIGINS にカンマ区切りで指定する（例: http://localhost:3000,http://192.168.0.10:3000）。
func AllowedOrigins() []string {
	v := os.Getenv(allowedOriginsKey)
	if v == "" {
		return defaultAllowedOrigins
	}
	var origins []string
	for _, o := range strings.Split(v, ",") {
		if o = strings.TrimSpace(o); o != "" {
			origins = append(origins, o)
		}
	}
	return origins
}

const publicBaseURLKey = "PUBLIC_BASE_URL"

// PublicBaseURL は、スマホで発行用 QR を開くときの URL の頭（例: http://<ラズパイの IP アドレス>:8081）。
// 部室の Wi-Fi から届く入口の場所。IP アドレスはリポジトリに書かず、.env で設定する。
// 未設定なら空文字を返す（その場合、発行用 QR は作らない）。
func PublicBaseURL() string {
	return strings.TrimRight(strings.TrimSpace(os.Getenv(publicBaseURLKey)), "/")
}
