package repository

import (
	"context"
	"database/sql"

	"sysken-pay-api/app/domain/repository"
)

var _ repository.AdminAllowlistRepository = (*AdminAllowlistRepositoryImpl)(nil)

// AdminAllowlistRepositoryImpl は admin_allowlist テーブル（db/migrations/007_admin_allowlist.sql）を扱う
type AdminAllowlistRepositoryImpl struct {
	db *sql.DB
}

func NewAdminAllowlistRepository(db *sql.DB) *AdminAllowlistRepositoryImpl {
	return &AdminAllowlistRepositoryImpl{db: db}
}

func (r *AdminAllowlistRepositoryImpl) Exists(ctx context.Context, upn string) (bool, error) {
	executor := getExecutor(ctx, r.db)
	var one int
	err := executor.QueryRowContext(ctx, "SELECT 1 FROM admin_allowlist WHERE upn = ?", upn).Scan(&one)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *AdminAllowlistRepositoryImpl) ExistsByStudentID(ctx context.Context, studentID string) (bool, error) {
	if studentID == "" {
		return false, nil // 学籍番号を持たない行（システムアカウント）には一致させない
	}
	executor := getExecutor(ctx, r.db)
	var one int
	err := executor.QueryRowContext(ctx, "SELECT 1 FROM admin_allowlist WHERE student_id = ? LIMIT 1", studentID).Scan(&one)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *AdminAllowlistRepositoryImpl) List(ctx context.Context) ([]repository.AdminAllow, error) {
	executor := getExecutor(ctx, r.db)
	rows, err := executor.QueryContext(ctx, `
	SELECT upn, student_id, added_by, created_at FROM admin_allowlist ORDER BY created_at, upn
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []repository.AdminAllow{}
	for rows.Next() {
		var a repository.AdminAllow
		var studentID sql.NullString
		if err := rows.Scan(&a.UPN, &studentID, &a.AddedBy, &a.CreatedAt); err != nil {
			return nil, err
		}
		a.StudentID = studentID.String
		list = append(list, a)
	}
	return list, rows.Err()
}

func (r *AdminAllowlistRepositoryImpl) Insert(ctx context.Context, a repository.AdminAllow) (bool, error) {
	executor := getExecutor(ctx, r.db)
	var studentID any
	if a.StudentID != "" {
		studentID = a.StudentID
	}
	res, err := executor.ExecContext(ctx, `
	INSERT IGNORE INTO admin_allowlist (upn, student_id, added_by) VALUES (?, ?, ?)
	`, a.UPN, studentID, a.AddedBy)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func (r *AdminAllowlistRepositoryImpl) LockAll(ctx context.Context) ([]string, error) {
	executor := getExecutor(ctx, r.db)
	rows, err := executor.QueryContext(ctx, "SELECT upn FROM admin_allowlist ORDER BY upn FOR UPDATE")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var upns []string
	for rows.Next() {
		var upn string
		if err := rows.Scan(&upn); err != nil {
			return nil, err
		}
		upns = append(upns, upn)
	}
	return upns, rows.Err()
}

func (r *AdminAllowlistRepositoryImpl) Delete(ctx context.Context, upn string) (bool, error) {
	executor := getExecutor(ctx, r.db)
	res, err := executor.ExecContext(ctx, "DELETE FROM admin_allowlist WHERE upn = ?", upn)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return n > 0, nil
}
