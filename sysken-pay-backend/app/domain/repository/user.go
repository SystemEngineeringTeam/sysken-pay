package repository

import (
	"context"
	"sysken-pay-api/app/domain/object/user"
)

//TODO　ユーザを登録するインターフェースを作成する
//データベースで必要な入力と出力のインターフェースの作成

type UserRepository interface {
	// ユーザーIDでユーザー情報を取得する
	GetUserByID(ctx context.Context, userID string) (*user.User, error)

	// ユーザーを新規作成して保存する
	// 保存に成功した場合は保存したユーザーを返す
	InsertUser(ctx context.Context, u *user.User) (*user.User, error)

	// ユーザー情報を更新して保存する
	// 保存に成功した場合は保存したユーザーを返す
	UpdateUser(ctx context.Context, u *user.User) (*user.User, error)

	// IsStopped はユーザーが利用停止しているか（GetUserByID で見つからなかったときに、理由を確かめるため）。
	// ユーザーがいなければ false
	IsStopped(ctx context.Context, userID string) (bool, error)

	// ChangeUserID は学籍番号（ユーザーの ID）を変える（登録のときの打ち間違いを直すため）。
	// チャージ・購入・残高・返金・支払い用バーコードの記録も新しい学籍番号に付け替える。トランザクションの中で呼ぶこと。
	// 古い学籍番号のユーザーがいなければ ErrUserNotFound、新しい学籍番号がもう使われていれば ErrUserAlreadyExists
	ChangeUserID(ctx context.Context, oldID, newID string) error
}
