// Package member は管理者画面のユーザー一覧と、退部・卒業のとき（返金・利用停止・再開）の処理。
// 設計は docs/phone-payment.md の「退部・卒業」を参照。
package member

import (
	"context"
	"errors"
	"fmt"

	domainmember "sysken-pay-api/app/domain/object/member"
	domainuser "sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/domain/repository"
)

var (
	// ErrUserNotFound はユーザーがいない（404）
	ErrUserNotFound = errors.New("user not found")
	// ErrNothingToRefund は残高が 0 で返金するものがない（409）
	ErrNothingToRefund = errors.New("nothing to refund")
	// ErrAlreadyStopped はすでに利用停止している（409）
	ErrAlreadyStopped = errors.New("user already stopped")
	// ErrNotStopped は利用停止していないので再開できない（409）
	ErrNotStopped = errors.New("user not stopped")
	// ErrBalanceRemaining は残高が残っているので非表示にできない（409）。先に返金する
	ErrBalanceRemaining = errors.New("balance remaining")
	// ErrAlreadyHidden はすでに非表示にしている（409）
	ErrAlreadyHidden = errors.New("user already hidden")
	// ErrNotHidden は非表示にしていないので解除できない（409）
	ErrNotHidden = errors.New("user not hidden")
	// ErrHasHistory は購入・チャージ・返金の記録があるので削除できない（409）。記録は消さない
	ErrHasHistory = errors.New("user has history")
)

type UseCase interface {
	// List は全員（止めた人も含む）を返す
	List(ctx context.Context) ([]*domainmember.Summary, error)
	// Refund は残高ちょうどを返金して、返した額を返す
	Refund(ctx context.Context, userID string) (int, error)
	// Stop は利用停止にして（支払い用バーコードも使えなくする）、残っている残高を返す
	Stop(ctx context.Context, userID string) (int, error)
	// Resume は利用停止を解除する（このあと支払い用バーコードを発行し直す）
	Resume(ctx context.Context, userID string) error
	// Hide は停止中で残高が 0 の人を、一覧から非表示にする（記録は消さない）
	Hide(ctx context.Context, userID string) error
	// Unhide は非表示を解除する
	Unhide(ctx context.Context, userID string) error
	// Delete は停止中で、購入・チャージ・返金の記録が1件もない人を消す（取り消せない）
	Delete(ctx context.Context, userID string) error
}

type ServiceImpl struct {
	memberRepo  repository.MemberRepository
	balanceRepo repository.BalanceRepository
	cardRepo    repository.PaymentCardRepository
	tx          repository.Transaction
}

func NewUseCase(
	memberRepo repository.MemberRepository,
	balanceRepo repository.BalanceRepository,
	cardRepo repository.PaymentCardRepository,
	tx repository.Transaction,
) *ServiceImpl {
	return &ServiceImpl{memberRepo: memberRepo, balanceRepo: balanceRepo, cardRepo: cardRepo, tx: tx}
}

// validateUserID は学籍番号の形式を確かめる（不正なら 400 になるエラー）
func validateUserID(userID string) error {
	return (&domainuser.User{}).SetUserID(userID)
}

// lock はユーザーの行をロックして状態を返す。いなければ ErrUserNotFound
func (s *ServiceImpl) lock(ctx context.Context, userID string) (domainmember.Status, error) {
	status, found, err := s.memberRepo.LockMember(ctx, userID)
	if err != nil {
		return "", err
	}
	if !found {
		return "", fmt.Errorf("%w: userID=%s", ErrUserNotFound, userID)
	}
	return status, nil
}

func (s *ServiceImpl) List(ctx context.Context) ([]*domainmember.Summary, error) {
	return s.memberRepo.ListMembers(ctx)
}

func (s *ServiceImpl) Refund(ctx context.Context, userID string) (int, error) {
	if err := validateUserID(userID); err != nil {
		return 0, err
	}
	var refunded int
	// 残高の読み取りと返金の記録を同じトランザクションで行う（途中で購入されて額がずれないように、ユーザーの行をロックする）
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		if _, err := s.lock(ctx, userID); err != nil {
			return err
		}
		b, err := s.balanceRepo.GetBalance(ctx, userID)
		if err != nil {
			return err
		}
		if b.Balance() <= 0 {
			return ErrNothingToRefund
		}
		refunded = b.Balance()
		return s.memberRepo.InsertRefund(ctx, userID, refunded)
	})
	if err != nil {
		return 0, err
	}
	return refunded, nil
}

func (s *ServiceImpl) Stop(ctx context.Context, userID string) (int, error) {
	if err := validateUserID(userID); err != nil {
		return 0, err
	}
	var remaining int
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		status, err := s.lock(ctx, userID)
		if err != nil {
			return err
		}
		if status == domainmember.StatusStopped {
			return ErrAlreadyStopped
		}
		// 支払い用バーコードを使えなくしてから止める
		if err := s.cardRepo.RevokeActiveByUserID(ctx, userID); err != nil {
			return err
		}
		if err := s.memberRepo.Stop(ctx, userID); err != nil {
			return err
		}
		b, err := s.balanceRepo.GetBalance(ctx, userID)
		if err != nil {
			return err
		}
		remaining = b.Balance()
		return nil
	})
	if err != nil {
		return 0, err
	}
	return remaining, nil
}

func (s *ServiceImpl) Resume(ctx context.Context, userID string) error {
	if err := validateUserID(userID); err != nil {
		return err
	}
	return s.tx.Do(ctx, func(ctx context.Context) error {
		status, err := s.lock(ctx, userID)
		if err != nil {
			return err
		}
		if status != domainmember.StatusStopped {
			return ErrNotStopped
		}
		return s.memberRepo.Resume(ctx, userID)
	})
}

func (s *ServiceImpl) Hide(ctx context.Context, userID string) error {
	if err := validateUserID(userID); err != nil {
		return err
	}
	return s.tx.Do(ctx, func(ctx context.Context) error {
		status, err := s.lock(ctx, userID)
		if err != nil {
			return err
		}
		if status != domainmember.StatusStopped {
			return ErrNotStopped
		}
		hidden, err := s.memberRepo.IsHidden(ctx, userID)
		if err != nil {
			return err
		}
		if hidden {
			return ErrAlreadyHidden
		}
		// 残高が残っている人（未返金）が見えなくならないように、返金してからにする
		b, err := s.balanceRepo.GetBalance(ctx, userID)
		if err != nil {
			return err
		}
		if b.Balance() != 0 {
			return ErrBalanceRemaining
		}
		return s.memberRepo.Hide(ctx, userID)
	})
}

func (s *ServiceImpl) Unhide(ctx context.Context, userID string) error {
	if err := validateUserID(userID); err != nil {
		return err
	}
	return s.tx.Do(ctx, func(ctx context.Context) error {
		if _, err := s.lock(ctx, userID); err != nil {
			return err
		}
		hidden, err := s.memberRepo.IsHidden(ctx, userID)
		if err != nil {
			return err
		}
		if !hidden {
			return ErrNotHidden
		}
		return s.memberRepo.Unhide(ctx, userID)
	})
}

func (s *ServiceImpl) Delete(ctx context.Context, userID string) error {
	if err := validateUserID(userID); err != nil {
		return err
	}
	return s.tx.Do(ctx, func(ctx context.Context) error {
		status, err := s.lock(ctx, userID)
		if err != nil {
			return err
		}
		if status != domainmember.StatusStopped {
			return ErrNotStopped
		}
		// 購入・チャージ・返金の記録が1件でもあれば消さない（会計の記録を残す）
		has, err := s.memberRepo.HasHistory(ctx, userID)
		if err != nil {
			return err
		}
		if has {
			return ErrHasHistory
		}
		return s.memberRepo.Delete(ctx, userID)
	})
}
