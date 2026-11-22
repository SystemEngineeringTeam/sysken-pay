// Package adminallow は、管理サイトに Entra でログインしてよい人（許可リスト）を扱う。
package adminallow

import (
	"context"
	"errors"

	"sysken-pay-api/app/domain/derrors"
	"sysken-pay-api/app/domain/object/aitid"
	"sysken-pay-api/app/domain/repository"
)

var (
	// ErrAlreadyAllowed はすでに許可リストにいる（API では 409）
	ErrAlreadyAllowed = errors.New("already allowed")
	// ErrNotFound は許可リストにいない（API では 404）
	ErrNotFound = errors.New("not in allowlist")
	// ErrLastAdmin は最後の1人を消そうとした（API では 409。誰も入れなくなるため）
	ErrLastAdmin = errors.New("cannot remove the last admin")
	// ErrSelf は自分自身を消そうとした（API では 409）
	ErrSelf = errors.New("cannot remove yourself")
)

// PasswordActor は予備のパスワードで操作したときの「誰が」（UPN を持たない）
const PasswordActor = "password"

type UseCase interface {
	List(ctx context.Context) ([]repository.AdminAllow, error)
	// Add は許可リストに足す。by は足した人の UPN（パスワードのときは PasswordActor）
	Add(ctx context.Context, upn, by string) (repository.AdminAllow, error)
	// Remove は許可リストから消す。by は消す人の UPN（パスワードのときは PasswordActor）
	Remove(ctx context.Context, upn, by string) error
}

type useCase struct {
	repo repository.AdminAllowlistRepository
	tx   repository.Transaction
}

func NewUseCase(repo repository.AdminAllowlistRepository, tx repository.Transaction) UseCase {
	return &useCase{repo: repo, tx: tx}
}

func (u *useCase) List(ctx context.Context) ([]repository.AdminAllow, error) {
	return u.repo.List(ctx)
}

func (u *useCase) Add(ctx context.Context, upn, by string) (repository.AdminAllow, error) {
	normalized, err := aitid.NormalizeUPN(upn)
	if err != nil {
		return repository.AdminAllow{}, derrors.Invalid("upn must be a student account (e.g. x24042xx@aitech.ac.jp) or the system account")
	}
	// 学籍番号を持たない人（システムアカウント）は空のまま
	studentID, _ := aitid.StudentIDFromUPN(normalized)
	a := repository.AdminAllow{UPN: normalized, StudentID: studentID, AddedBy: by}

	inserted, err := u.repo.Insert(ctx, a)
	if err != nil {
		return repository.AdminAllow{}, err
	}
	if !inserted {
		return repository.AdminAllow{}, ErrAlreadyAllowed
	}
	return a, nil
}

func (u *useCase) Remove(ctx context.Context, upn, by string) error {
	normalized, err := aitid.NormalizeUPN(upn)
	if err != nil {
		return derrors.Invalid("upn is invalid")
	}
	if normalized == by {
		return ErrSelf
	}

	return u.tx.Do(ctx, func(ctx context.Context) error {
		// 数えてから消す間に別の削除が入らないよう、全員の行をロックする
		upns, err := u.repo.LockAll(ctx)
		if err != nil {
			return err
		}
		found := false
		for _, x := range upns {
			if x == normalized {
				found = true
			}
		}
		if !found {
			return ErrNotFound
		}
		if len(upns) <= 1 {
			return ErrLastAdmin
		}
		deleted, err := u.repo.Delete(ctx, normalized)
		if err != nil {
			return err
		}
		if !deleted {
			return ErrNotFound
		}
		return nil
	})
}
