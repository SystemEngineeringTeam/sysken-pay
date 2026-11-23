package repository

import (
	"context"
	"database/sql"
	"sysken-pay-api/app/domain/object/charge"
	"sysken-pay-api/app/domain/repository"
	"time"
)

var _ repository.ChargeRepository = (*ChargeRepositoryImpl)(nil)

type ChargeRepositoryImpl struct {
	db *sql.DB
}

func NewChargeRepository(db *sql.DB) *ChargeRepositoryImpl {
	return &ChargeRepositoryImpl{
		db: db,
	}
}

// ChargeAmount は指定された金額をチャージし、チャージ情報を返す
func (r *ChargeRepositoryImpl) ChargeAmount(ctx context.Context, c *charge.Charge) (*charge.Charge, error) {

	executor := getExecutor(ctx, r.db)

	// 1. charge テーブルへ挿入
	queryCharge := `INSERT INTO charge (user_id, amount, created_at) VALUES (?, ?, ?)`
	createdAt := time.Now()
	res, err := executor.ExecContext(ctx, queryCharge, c.UserID(), c.Amount(), createdAt)
	if err != nil {
		return nil, err
	}

	chargeID, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	if err := c.SetID(int(chargeID)); err != nil {
		return nil, err
	}
	if err := c.SetCreatedAt(createdAt); err != nil {
		return nil, err
	}

	// 2. balance テーブルへ挿入 (残高追加)
	queryBalance := `INSERT INTO balance (user_id, charge_id, amount, created_at) VALUES (?, ?, ?, ?)`
	// チャージなので amount は正の値
	if _, err := executor.ExecContext(ctx, queryBalance, c.UserID(), int(chargeID), c.Amount(), createdAt); err != nil {
		return nil, err
	}

	// 3. 現在の残高を集計して取得
	var currentBalance int
	querySum := `SELECT IFNULL(SUM(amount), 0) FROM balance WHERE user_id = ?`
	if err := executor.QueryRowContext(ctx, querySum, c.UserID()).Scan(&currentBalance); err != nil {
		return nil, err
	}

	if err := c.SetBalance(currentBalance); err != nil {
		return nil, err
	}

	return c, nil
}
