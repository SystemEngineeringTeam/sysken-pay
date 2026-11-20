package repository

import (
	"context"
	"database/sql"
	"errors"

	"sysken-pay-api/app/domain/repository"
)

var _ repository.HriRepository = (*HriRepositoryImpl)(nil)

// HriRepositoryImpl は HRI（スマホの SP バーコードの番号）を扱う。
// テーブル名は昔の名前のまま payment_card（名前は変えていない）。
type HriRepositoryImpl struct {
	db *sql.DB
}

func NewHriRepository(db *sql.DB) *HriRepositoryImpl {
	return &HriRepositoryImpl{db: db}
}

func (r *HriRepositoryImpl) RevokeActiveByUserID(ctx context.Context, userID string) error {
	executor := getExecutor(ctx, r.db)

	// 同じユーザーの発行が同時に走ったときに、使えるものが2つにならないようにユーザーの行をロックする
	var lockedID string
	if err := executor.QueryRowContext(ctx,
		"SELECT id FROM `user` WHERE id = ? FOR UPDATE", userID,
	).Scan(&lockedID); err != nil {
		return err
	}

	_, err := executor.ExecContext(ctx, `
	UPDATE payment_card SET revoked_at = CURRENT_TIMESTAMP
	WHERE user_id = ? AND revoked_at IS NULL
	`, userID)
	return err
}

func (r *HriRepositoryImpl) Insert(ctx context.Context, userID string, codeHash string) error {
	executor := getExecutor(ctx, r.db)
	_, err := executor.ExecContext(ctx, `
	INSERT INTO payment_card (user_id, code_hash) VALUES (?, ?)
	`, userID, codeHash)
	return err
}

func (r *HriRepositoryImpl) FindActiveUserIDByHash(ctx context.Context, codeHash string) (string, error) {
	executor := getExecutor(ctx, r.db)
	var userID string
	err := executor.QueryRowContext(ctx, `
	SELECT user_id FROM payment_card
	WHERE code_hash = ? AND revoked_at IS NULL
	`, codeHash).Scan(&userID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return userID, nil
}

func (r *HriRepositoryImpl) FindRevokedUserIDByHash(ctx context.Context, codeHash string) (string, error) {
	executor := getExecutor(ctx, r.db)
	var userID string
	err := executor.QueryRowContext(ctx, `
	SELECT user_id FROM payment_card
	WHERE code_hash = ? AND revoked_at IS NOT NULL
	`, codeHash).Scan(&userID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return userID, nil
}
