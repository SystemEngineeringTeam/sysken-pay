package repository

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/domain/repository"
	"time"

	"github.com/go-sql-driver/mysql"
)

// mysqlErrDupEntry は重複キー違反 (Duplicate entry) を示す MySQL のエラー番号です。
const mysqlErrDupEntry = 1062

//TODO userデータベースに値を入れる
// domainのrepositoryの中にあるユーザーのインターフェースの実装をする

var _ repository.UserRepository = (*UserRepositoryImpl)(nil)

type UserRepositoryImpl struct {
	db *sql.DB
}

func NewUserProfileRepository(db *sql.DB) *UserRepositoryImpl {
	return &UserRepositoryImpl{db: db}
}

func (r *UserRepositoryImpl) GetUserByID(ctx context.Context, userID string) (*user.User, error) {
	executor := getExecutor(ctx, r.db)

	row := executor.QueryRowContext(ctx, `
	SELECT id, name, created_at, updated_at, deleted_at
	FROM `+"`user`"+`
	WHERE id = ? AND deleted_at IS NULL
	`, userID)

	var (
		id        string
		name      string
		createdAt time.Time
		updatedAt time.Time
		deletedAt sql.NullTime
	)
	if err := row.Scan(&id, &name, &createdAt, &updatedAt, &deletedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	var deleted time.Time
	if deletedAt.Valid {
		deleted = deletedAt.Time
	}

	return user.NewUserFromDB(id, name, createdAt, updatedAt, deleted)
}

func (r *UserRepositoryImpl) IsStopped(ctx context.Context, userID string) (bool, error) {
	executor := getExecutor(ctx, r.db)
	var stopped bool
	err := executor.QueryRowContext(ctx,
		"SELECT deleted_at IS NOT NULL FROM `user` WHERE id = ?", userID,
	).Scan(&stopped)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return stopped, err
}

// userIDTables は user.id を参照している表（学籍番号を変えるときに付け替える）
var userIDTables = []string{"charge", "purchase", "balance", "payment_card", "refund"}

func (r *UserRepositoryImpl) ChangeUserID(ctx context.Context, oldID, newID string) error {
	executor := getExecutor(ctx, r.db)

	// 変えている途中に、同じ人の購入・チャージが走らないようにロックする
	var locked string
	err := executor.QueryRowContext(ctx, "SELECT id FROM `user` WHERE id = ? FOR UPDATE", oldID).Scan(&locked)
	if errors.Is(err, sql.ErrNoRows) {
		return user.ErrUserNotFound
	}
	if err != nil {
		return err
	}

	// 主キーは他の表から参照されていて直接は変えられないので、
	// 新しい学籍番号の行を作る → 記録を付け替える → 古い行を消す、の順で行う（記録そのものは消さない）
	_, err = executor.ExecContext(ctx, `
	INSERT INTO `+"`user`"+` (id, name, created_at, updated_at, deleted_at, hidden_at)
	SELECT ?, name, created_at, updated_at, deleted_at, hidden_at FROM `+"`user`"+` WHERE id = ?
	`, newID, oldID)
	if err != nil {
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == mysqlErrDupEntry {
			return user.ErrUserAlreadyExists
		}
		return err
	}
	for _, table := range userIDTables {
		if _, err := executor.ExecContext(ctx,
			"UPDATE `"+table+"` SET user_id = ? WHERE user_id = ?", newID, oldID); err != nil {
			return err
		}
	}
	_, err = executor.ExecContext(ctx, "DELETE FROM `user` WHERE id = ?", oldID)
	return err
}

func (r *UserRepositoryImpl) InsertUser(
	ctx context.Context, u *user.User) (*user.User, error) {

	executor := getExecutor(ctx, r.db)

	query := `
    INSERT INTO ` + "`user`" + ` (id, name, deleted_at)
    VALUES (?, ?,  NULL)
	`
	_, err := executor.ExecContext(ctx, query,
		u.ID(),
		u.UserName(),
	)

	if err != nil {
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == mysqlErrDupEntry {
			return nil, user.ErrUserAlreadyExists
		}
		log.Printf("Failed to insert user: %v", err)
		return nil, err
	}

	row := executor.QueryRowContext(ctx, `
    SELECT created_at, updated_at FROM `+"`user`"+` WHERE id = ?
	`, u.ID())

	var createdAt, updatedAt time.Time
	if err := row.Scan(&createdAt, &updatedAt); err != nil {
		return nil, err
	}

	u.SetCreatedAt(createdAt)
	u.SetUpdatedAt(updatedAt)

	return u, nil
}

func (r *UserRepositoryImpl) UpdateUser(
	ctx context.Context, u *user.User) (*user.User, error) {

	executor := getExecutor(ctx, r.db)

	query := `
	UPDATE ` + "`user`" + ` SET name = ? WHERE id = ? AND deleted_at IS NULL
	`
	_, err := executor.ExecContext(ctx, query,
		u.UserName(),
		u.ID(),
	)

	if err != nil {
		log.Printf("Failed to update user: %v", err)
		return nil, err
	}
	row := executor.QueryRowContext(ctx, `
	SELECT created_at, updated_at FROM `+"`user`"+` WHERE id = ?
	`, u.ID())

	var createdAt, updatedAt time.Time
	if err := row.Scan(&createdAt, &updatedAt); err != nil {
		return nil, err
	}

	u.SetCreatedAt(createdAt)
	u.SetUpdatedAt(updatedAt)

	return u, nil
}
