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

	// IsHidden は一覧から非表示にしているか（LockMember のあと、同じトランザクションの中で使う）
	IsHidden(ctx context.Context, userID string) (bool, error)

	// Hide は一覧から非表示にする（user.hidden_at を入れる）。記録は消さない
	Hide(ctx context.Context, userID string) error

	// Unhide は非表示を解除する（user.hidden_at を消す）
	Unhide(ctx context.Context, userID string) error

	// HasHistory は購入・チャージ・返金の記録が1件でもあるか
	HasHistory(ctx context.Context, userID string) (bool, error)

	// Delete はユーザーの行と、支払い用バーコード・発行用 QR の行を消す。
	// 購入・チャージ・返金の記録がある人は外部キーで失敗する（呼ぶ前に HasHistory で確かめる）
	Delete(ctx context.Context, userID string) error

	// InsertRefund は返金を記録して、残高から amount を引く
	InsertRefund(ctx context.Context, userID string, amount int) error
}
