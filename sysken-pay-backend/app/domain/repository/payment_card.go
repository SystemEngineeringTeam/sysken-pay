package repository

import "context"

// PaymentCardRepository は支払い用バーコードの保存先。
// 支払い用バーコードの文字列そのものは扱わず、ハッシュだけを扱う。
type PaymentCardRepository interface {
	// RevokeActiveByUserID はそのユーザーの使える支払い用バーコードをすべて使えなくする。
	// 同じユーザーの発行が同時に走っても使えるものが2つにならないよう、ユーザーの行をロックしてから行う。
	// トランザクションの中で呼ぶこと。
	RevokeActiveByUserID(ctx context.Context, userID string) error

	// Insert は新しい支払い用バーコード（のハッシュ）を、使える状態で保存する。
	Insert(ctx context.Context, userID string, codeHash string) error

	// FindActiveUserIDByHash は使える支払い用バーコードのハッシュから学籍番号を探す。
	// 見つからない（存在しない・使えなくなっている）ときは "" を返す。
	FindActiveUserIDByHash(ctx context.Context, codeHash string) (string, error)
}
