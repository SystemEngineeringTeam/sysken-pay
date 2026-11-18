package repository

import (
	"context"
	"database/sql"
	"errors"

	"sysken-pay-api/app/domain/object/paymentcard"
	"sysken-pay-api/app/domain/repository"
)

var _ repository.PaymentCardRepository = (*PaymentCardRepositoryImpl)(nil)

type PaymentCardRepositoryImpl struct {
	db *sql.DB
}

func NewPaymentCardRepository(db *sql.DB) *PaymentCardRepositoryImpl {
	return &PaymentCardRepositoryImpl{db: db}
}

func (r *PaymentCardRepositoryImpl) RevokeActiveByUserID(ctx context.Context, userID string) error {
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

func (r *PaymentCardRepositoryImpl) Insert(ctx context.Context, userID string, codeHash string) error {
	executor := getExecutor(ctx, r.db)
	_, err := executor.ExecContext(ctx, `
	INSERT INTO payment_card (user_id, code_hash) VALUES (?, ?)
	`, userID, codeHash)
	return err
}

func (r *PaymentCardRepositoryImpl) FindActiveUserIDByHash(ctx context.Context, codeHash string) (string, error) {
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

func (r *PaymentCardRepositoryImpl) FindRevokedUserIDByHash(ctx context.Context, codeHash string) (string, error) {
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

var _ repository.PaymentCardClaimRepository = (*PaymentCardClaimRepositoryImpl)(nil)

type PaymentCardClaimRepositoryImpl struct {
	db *sql.DB
}

func NewPaymentCardClaimRepository(db *sql.DB) *PaymentCardClaimRepositoryImpl {
	return &PaymentCardClaimRepositoryImpl{db: db}
}

func (r *PaymentCardClaimRepositoryImpl) InsertClaim(
	ctx context.Context, userID, tokenHash string, sealedCode []byte, ttlSeconds int,
) (int64, error) {
	executor := getExecutor(ctx, r.db)
	res, err := executor.ExecContext(ctx, `
	INSERT INTO payment_card_claim (user_id, token_hash, sealed_code, expires_at)
	VALUES (?, ?, ?, CURRENT_TIMESTAMP + INTERVAL ? SECOND)
	`, userID, tokenHash, sealedCode, ttlSeconds)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *PaymentCardClaimRepositoryImpl) FindClaimByTokenHash(ctx context.Context, tokenHash string) (*paymentcard.Claim, error) {
	executor := getExecutor(ctx, r.db)
	c := &paymentcard.Claim{}
	err := executor.QueryRowContext(ctx, `
	SELECT id, user_id, sealed_code, open_count, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, expires_at)
	FROM payment_card_claim WHERE token_hash = ?
	`, tokenHash).Scan(&c.ID, &c.UserID, &c.SealedCode, &c.OpenCount, &c.RemainingSeconds)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *PaymentCardClaimRepositoryImpl) FindClaimByID(ctx context.Context, id int64) (*paymentcard.Claim, error) {
	executor := getExecutor(ctx, r.db)
	c := &paymentcard.Claim{}
	err := executor.QueryRowContext(ctx, `
	SELECT id, user_id, open_count, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, expires_at)
	FROM payment_card_claim WHERE id = ?
	`, id).Scan(&c.ID, &c.UserID, &c.OpenCount, &c.RemainingSeconds)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *PaymentCardClaimRepositoryImpl) IncrementOpenCount(ctx context.Context, id int64) error {
	executor := getExecutor(ctx, r.db)
	_, err := executor.ExecContext(ctx, `UPDATE payment_card_claim SET open_count = open_count + 1 WHERE id = ?`, id)
	return err
}

func (r *PaymentCardClaimRepositoryImpl) DeleteExpiredClaims(ctx context.Context) error {
	executor := getExecutor(ctx, r.db)
	_, err := executor.ExecContext(ctx, `DELETE FROM payment_card_claim WHERE expires_at < CURRENT_TIMESTAMP`)
	return err
}
