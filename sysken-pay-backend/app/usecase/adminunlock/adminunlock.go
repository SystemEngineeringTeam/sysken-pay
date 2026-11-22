// Package adminunlock は、管理者として登録された人のシス研Payバーコード（HRI）で、
// ラズパイのチャージ画面・管理メニューのパスワード入力を省くためのユースケース。
// 設計は docs/phone-payment.md の「管理者バーコードでの解除」を参照。
package adminunlock

import (
	"context"
	"errors"
	"fmt"

	"sysken-pay-api/app/domain/object/aitid"
	"sysken-pay-api/app/domain/repository"
	"sysken-pay-api/app/usecase/paymentcard"
)

// ErrNotAdmin は、バーコードは本物だが、持ち主が管理者の許可リストにいないことを表す（API では 403）
var ErrNotAdmin = errors.New("not an admin")

type UseCase interface {
	// Unlock は HRI の持ち主が管理者か確かめる。管理者でなければ ErrNotAdmin。
	// HRI の形式不正・見つからない・利用停止は paymentcard.Resolve と同じエラーを返す
	Unlock(ctx context.Context, hri string) error
}

type useCase struct {
	resolve paymentcard.ResolveUseCase
	allow   repository.AdminAllowlistRepository
}

func NewUseCase(resolve paymentcard.ResolveUseCase, allow repository.AdminAllowlistRepository) UseCase {
	return &useCase{resolve: resolve, allow: allow}
}

func (u *useCase) Unlock(ctx context.Context, hri string) error {
	owner, err := u.resolve.Resolve(ctx, hri)
	if err != nil {
		return err
	}
	// user.id（20X24042）→ 学籍番号（X24042）→ 許可リストの student_id。
	// 学籍番号の形でない id は、管理者とは認めない
	studentID, ok := aitid.StudentIDFromUserID(owner.ID())
	if !ok {
		return ErrNotAdmin
	}
	allowed, err := u.allow.ExistsByStudentID(ctx, studentID)
	if err != nil {
		return fmt.Errorf("check admin allowlist: %w", err)
	}
	if !allowed {
		return ErrNotAdmin
	}
	return nil
}
