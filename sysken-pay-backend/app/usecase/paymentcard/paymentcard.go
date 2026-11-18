// Package paymentcard は支払い用バーコードの発行・作り直し・照合のユースケース。
// 設計は docs/phone-payment.md を参照。
package paymentcard

import (
	"context"
	"errors"
	"fmt"

	domainpc "sysken-pay-api/app/domain/object/paymentcard"
	domainuser "sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/domain/repository"
)

var (
	// ErrUserNotFound は発行しようとした学籍番号のユーザーが登録されていないことを表す（API では 404）
	ErrUserNotFound = errors.New("user not found")
	// ErrCardNotFound は支払い用バーコードが存在しない、または使えなくなっていることを表す（API では 404）。
	// 「存在しない」と「使えなくなった」は区別しない（区別すると、当てずっぽうの入力に手がかりを与えるため）
	ErrCardNotFound = errors.New("payment card not found")
)

// IssuedCard は発行した支払い用バーコード。Code はこのときにしか取り出せない（DB にはハッシュしかない）
type IssuedCard struct {
	User *domainuser.User
	Code string
}

type IssueUseCase interface {
	// Issue は支払い用バーコードを発行する。すでに使えるものがあれば使えなくしてから新しく発行する（作り直し）
	Issue(ctx context.Context, userID string) (*IssuedCard, error)
}

type ResolveUseCase interface {
	// Resolve は読み取った支払い用バーコードから、その持ち主を返す
	Resolve(ctx context.Context, code string) (*domainuser.User, error)
}

type IssueServiceImpl struct {
	userRepo repository.UserRepository
	cardRepo repository.PaymentCardRepository
	tx       repository.Transaction
	generate func() (string, error)
}

func NewIssueUseCase(
	userRepo repository.UserRepository,
	cardRepo repository.PaymentCardRepository,
	tx repository.Transaction,
) *IssueServiceImpl {
	return &IssueServiceImpl{userRepo: userRepo, cardRepo: cardRepo, tx: tx, generate: domainpc.GenerateCode}
}

func (s *IssueServiceImpl) Issue(ctx context.Context, userID string) (*IssuedCard, error) {
	// 学籍番号の形式チェック（不正なら 400）
	if err := (&domainuser.User{}).SetUserID(userID); err != nil {
		return nil, err
	}

	u, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		// 利用停止している人は、先に「利用を再開」してから発行する
		if stopped, err := s.userRepo.IsStopped(ctx, userID); err != nil {
			return nil, err
		} else if stopped {
			return nil, fmt.Errorf("%w: userID=%s", domainuser.ErrUserStopped, userID)
		}
		return nil, fmt.Errorf("%w: userID=%s", ErrUserNotFound, userID)
	}

	code, err := s.generate()
	if err != nil {
		return nil, err
	}

	// 古いものを使えなくする → 新しいものを保存する、を1つのトランザクションで行う
	err = s.tx.Do(ctx, func(ctx context.Context) error {
		if err := s.cardRepo.RevokeActiveByUserID(ctx, userID); err != nil {
			return err
		}
		return s.cardRepo.Insert(ctx, userID, domainpc.HashCode(code))
	})
	if err != nil {
		return nil, err
	}

	return &IssuedCard{User: u, Code: code}, nil
}

type ResolveServiceImpl struct {
	userRepo repository.UserRepository
	cardRepo repository.PaymentCardRepository
}

func NewResolveUseCase(
	userRepo repository.UserRepository,
	cardRepo repository.PaymentCardRepository,
) *ResolveServiceImpl {
	return &ResolveServiceImpl{userRepo: userRepo, cardRepo: cardRepo}
}

func (s *ResolveServiceImpl) Resolve(ctx context.Context, code string) (*domainuser.User, error) {
	normalized, err := domainpc.NormalizeCode(code)
	if err != nil {
		return nil, err // 形式が不正（400）
	}

	userID, err := s.cardRepo.FindActiveUserIDByHash(ctx, domainpc.HashCode(normalized))
	if err != nil {
		return nil, err
	}
	if userID == "" {
		// 使えなくなったバーコードなら、持ち主が利用停止しているか確かめる（画面で「利用停止されています」と出すため）
		owner, err := s.cardRepo.FindRevokedUserIDByHash(ctx, domainpc.HashCode(normalized))
		if err != nil {
			return nil, err
		}
		if owner != "" {
			stopped, err := s.userRepo.IsStopped(ctx, owner)
			if err != nil {
				return nil, err
			}
			if stopped {
				return nil, domainuser.ErrUserStopped
			}
		}
		return nil, ErrCardNotFound
	}

	u, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		stopped, err := s.userRepo.IsStopped(ctx, userID)
		if err != nil {
			return nil, err
		}
		if stopped {
			return nil, domainuser.ErrUserStopped
		}
		// ユーザーがいない場合も、使えないバーコードとして扱う
		return nil, ErrCardNotFound
	}
	return u, nil
}
