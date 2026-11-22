package repository

import (
	"context"
	"time"
)

// AdminAllow は管理サイトに Entra でログインしてよい人（許可リストの1行）
type AdminAllow struct {
	// UPN は小文字の大学のアカウント（主キー）
	UPN string
	// StudentID は学籍番号（システムアカウントなど、持たない人は空）
	StudentID string
	// AddedBy は追加した人の UPN（予備のパスワードで追加したときは "password"）
	AddedBy   string
	CreatedAt time.Time
}

// AdminAllowlistRepository は管理サイトに Entra でログインしてよい人の保存先
type AdminAllowlistRepository interface {
	// Exists は UPN が許可リストにあるか
	Exists(ctx context.Context, upn string) (bool, error)
	// ExistsByStudentID は学籍番号（例: X24042）が許可リストにあるか。Pi の管理者バーコードの判定に使う
	ExistsByStudentID(ctx context.Context, studentID string) (bool, error)
	// List は許可リストを追加の古い順に返す
	List(ctx context.Context) ([]AdminAllow, error)
	// Insert は追加する。すでにあれば false（何も変えない）
	Insert(ctx context.Context, a AdminAllow) (inserted bool, err error)
	// LockAll は全員の UPN をロックして返す。「最後の1人を消さない」確認のため、トランザクションの中で呼ぶ
	LockAll(ctx context.Context) ([]string, error)
	// Delete は消す。いなければ false
	Delete(ctx context.Context, upn string) (deleted bool, err error)
}
