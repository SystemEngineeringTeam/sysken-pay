package repository

import (
	"context"

	"sysken-pay-api/app/domain/object/member"
)

// MemberRepository はユーザー一覧と、退部・卒業のとき（返金・利用停止・再開）の操作
type MemberRepository interface {
	// ListMembers は全員（止めた人も含む）を、残高と状態つきで返す
	ListMembers(ctx context.Context) ([]*member.Summary, error)

	// LockMember はユーザーの行をロックして状態を返す（トランザクションの中で使う）。
	// ユーザーがいなければ found=false
	LockMember(ctx context.Context, userID string) (status member.Status, found bool, err error)

	// Stop は利用停止にする（user.deleted_at を入れる）
	Stop(ctx context.Context, userID string) error

	// Resume は利用停止を解除する（user.deleted_at を消す）
	Resume(ctx context.Context, userID string) error

	// InsertRefund は返金を記録して、残高から amount を引く
	InsertRefund(ctx context.Context, userID string, amount int) error
}
