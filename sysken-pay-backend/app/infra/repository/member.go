package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"sysken-pay-api/app/domain/object/member"
	"sysken-pay-api/app/domain/repository"
)

var _ repository.MemberRepository = (*MemberRepositoryImpl)(nil)

type MemberRepositoryImpl struct {
	db *sql.DB
}

func NewMemberRepository(db *sql.DB) *MemberRepositoryImpl {
	return &MemberRepositoryImpl{db: db}
}

func (r *MemberRepositoryImpl) ListMembers(ctx context.Context) ([]*member.Summary, error) {
	executor := getExecutor(ctx, r.db)
	rows, err := executor.QueryContext(ctx, `
	SELECT u.id, u.name, u.deleted_at, IFNULL(b.total, 0),
	       EXISTS (SELECT 1 FROM payment_card pc WHERE pc.user_id = u.id AND pc.revoked_at IS NULL)
	FROM `+"`user`"+` u
	LEFT JOIN (SELECT user_id, SUM(amount) AS total FROM balance GROUP BY user_id) b ON b.user_id = u.id
	ORDER BY u.id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*member.Summary
	for rows.Next() {
		var (
			s         member.Summary
			deletedAt sql.NullTime
			hasCard   bool
		)
		if err := rows.Scan(&s.UserID, &s.UserName, &deletedAt, &s.Balance, &hasCard); err != nil {
			return nil, err
		}
		if deletedAt.Valid {
			t := deletedAt.Time
			s.StoppedAt = &t
		}
		s.HasPaymentCard = hasCard
		list = append(list, &s)
	}
	return list, rows.Err()
}

func (r *MemberRepositoryImpl) LockMember(ctx context.Context, userID string) (member.Status, bool, error) {
	executor := getExecutor(ctx, r.db)
	var deletedAt sql.NullTime
	err := executor.QueryRowContext(ctx,
		"SELECT deleted_at FROM `user` WHERE id = ? FOR UPDATE", userID,
	).Scan(&deletedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	if deletedAt.Valid {
		return member.StatusStopped, true, nil
	}
	return member.StatusActive, true, nil
}

func (r *MemberRepositoryImpl) Stop(ctx context.Context, userID string) error {
	executor := getExecutor(ctx, r.db)
	_, err := executor.ExecContext(ctx,
		"UPDATE `user` SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL", userID)
	return err
}

func (r *MemberRepositoryImpl) Resume(ctx context.Context, userID string) error {
	executor := getExecutor(ctx, r.db)
	_, err := executor.ExecContext(ctx,
		"UPDATE `user` SET deleted_at = NULL WHERE id = ?", userID)
	return err
}

func (r *MemberRepositoryImpl) InsertRefund(ctx context.Context, userID string, amount int) error {
	executor := getExecutor(ctx, r.db)
	now := time.Now()
	// 残高から引く（返金なので amount はマイナス）
	res, err := executor.ExecContext(ctx,
		"INSERT INTO balance (user_id, amount, created_at) VALUES (?, ?, ?)", userID, -amount, now)
	if err != nil {
		return err
	}
	balanceID, err := res.LastInsertId()
	if err != nil {
		return err
	}
	// 会計の記録として返金を残す（消さない）
	_, err = executor.ExecContext(ctx,
		"INSERT INTO refund (user_id, amount, balance_id, created_at) VALUES (?, ?, ?, ?)",
		userID, amount, balanceID, now)
	return err
}
