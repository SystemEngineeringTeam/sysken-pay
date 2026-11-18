package repository

import (
	"context"

	"sysken-pay-api/app/domain/object/paymentcard"
)

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

// PaymentCardClaimRepository は発行用 QR（5分だけ有効）の保存先。
// 期限の判定は DB の時刻で行う（アプリと DB の時刻のずれで判定が変わらないように）。
type PaymentCardClaimRepository interface {
	// InsertClaim は発行用 QR を保存し、ID を返す。期限は今から ttlSeconds 秒後
	InsertClaim(ctx context.Context, userID, tokenHash string, sealedCode []byte, ttlSeconds int) (int64, error)

	// FindClaimByTokenHash はトークンのハッシュから発行用 QR を探す。見つからなければ nil。
	// 期限切れのものも返す（RemainingSeconds で判定する）
	FindClaimByTokenHash(ctx context.Context, tokenHash string) (*paymentcard.Claim, error)

	// FindClaimByID は ID から発行用 QR を探す（SealedCode は入れない）。見つからなければ nil
	FindClaimByID(ctx context.Context, id int64) (*paymentcard.Claim, error)

	// IncrementOpenCount は開かれた回数を1増やす
	IncrementOpenCount(ctx context.Context, id int64) error

	// DeleteExpiredClaims は期限が切れた発行用 QR を消す（暗号化した支払い用バーコードを長く残さないため）
	DeleteExpiredClaims(ctx context.Context) error
}
