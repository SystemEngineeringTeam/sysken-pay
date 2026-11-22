package repository

import (
	"context"
	"database/sql"
	"sysken-pay-api/app/domain/object/item"
	"sysken-pay-api/app/domain/repository"
	"time"
)

//TODO itemデータベースに値を入れる
//domainのrepositoryの中にあるアイテムのインタフェースを実装する

var _ repository.ItemRepository = (*ItemRepositoryImpl)(nil)

type ItemRepositoryImpl struct {
	db *sql.DB
}

func NewItemRepository(db *sql.DB) *ItemRepositoryImpl {
	return &ItemRepositoryImpl{
		db: db,
	}
}

// TODO InsertItemメソッドの実装
func (r *ItemRepositoryImpl) InsertItem(ctx context.Context, i *item.Item) (*item.Item, error) {

	executor := getExecutor(ctx, r.db)

	query := `
	INSERT INTO item (jan_code, name, price, disabled_at)
	VALUES (?, ?, ?, NULL)
	`
	result, err := executor.ExecContext(ctx, query,
		i.JanCode(),
		i.Name(),
		i.Price(),
	)

	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	i.SetID(int(id))

	row := executor.QueryRowContext(
		ctx,
		`SELECT created_at, updated_at FROM item WHERE id = ?`,
		i.ID(),
	)

	var createdAt, updatedAt time.Time
	if err := row.Scan(&createdAt, &updatedAt); err != nil {
		return nil, err
	}

	i.SetCreatedAt(createdAt)
	i.SetUpdatedAt(updatedAt)

	return i, nil
}

// TODO UpdateItemメソッドの実装
func (r *ItemRepositoryImpl) UpdateItem(ctx context.Context, i *item.Item) (*item.Item, error) {

	executor := getExecutor(ctx, r.db)

	query := `
	UPDATE item
	SET name = ?, price = ?
	WHERE jan_code = ?
	`
	_, err := executor.ExecContext(ctx, query,
		i.Name(),
		i.Price(),
		i.JanCode(),
	)

	if err != nil {
		return nil, err
	}

	row := executor.QueryRowContext(
		ctx,
		`SELECT id, created_at, updated_at FROM item WHERE jan_code = ?`,
		i.JanCode(),
	)

	var (
		id        int
		createdAt time.Time
		updatedAt time.Time
	)
	if err := row.Scan(&id, &createdAt, &updatedAt); err != nil {
		return nil, err
	}

	i.SetID(int(id))
	i.SetCreatedAt(createdAt)
	i.SetUpdatedAt(updatedAt)

	return i, nil
}

// GetItemByID は商品IDで商品を取得する
func (r *ItemRepositoryImpl) GetItemByID(ctx context.Context, id int) (*item.Item, error) {
	executor := getExecutor(ctx, r.db)

	query := `
	SELECT id, jan_code, name, price, created_at, updated_at, disabled_at
	FROM item
	WHERE id = ? AND disabled_at IS NULL
	`

	row := executor.QueryRowContext(ctx, query, id)

	var (
		idDB       int
		janCodeDB  string
		nameDB     string
		priceDB    int
		createdAt  time.Time
		updatedAt  time.Time
		disabledAt sql.NullTime
	)

	if err := row.Scan(&idDB, &janCodeDB, &nameDB, &priceDB, &createdAt, &updatedAt, &disabledAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	var disabled time.Time
	if disabledAt.Valid {
		disabled = disabledAt.Time
	}

	return item.NewItemFromDB(idDB, janCodeDB, nameDB, priceDB, createdAt, updatedAt, disabled)
}

// TODO GetItemByJanCodeメソッドの実装
func (r *ItemRepositoryImpl) GetItemByJanCode(ctx context.Context, janCode string) (*item.Item, error) {

	executor := getExecutor(ctx, r.db)

	query := `
	SELECT id, jan_code, name, price, created_at, updated_at, disabled_at
	FROM item
	WHERE jan_code = ?
	`

	row := executor.QueryRowContext(ctx, query, janCode)

	var (
		id         int
		janCodeDB  string
		nameDB     string
		priceDB    int
		createdAt  time.Time
		updatedAt  time.Time
		disabledAt sql.NullTime
	)

	if err := row.Scan(
		&id,
		&janCodeDB,
		&nameDB,
		&priceDB,
		&createdAt,
		&updatedAt,
		&disabledAt,
	); err != nil {

		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// disabledAt が NULL ならゼロ値 time.Time にする
	var disabled time.Time
	if disabledAt.Valid {
		disabled = disabledAt.Time
	}

	i, err := item.NewItemFromDB(
		id,
		janCodeDB,
		nameDB,
		priceDB,
		createdAt,
		updatedAt,
		disabled,
	)
	if err != nil {
		return nil, err
	}

	return i, nil
}

// TODO GetAllItemsメソッドの実装
func (r *ItemRepositoryImpl) GetAllItems(ctx context.Context, includeDisabled bool) ([]*item.Item, error) {
	executor := getExecutor(ctx, r.db)

	query := `
	SELECT id, jan_code, name, price, created_at, updated_at, disabled_at
	FROM item
	`
	if !includeDisabled {
		query += "WHERE disabled_at IS NULL\n"
	}
	query += "ORDER BY id\n"

	rows, err := executor.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*item.Item

	for rows.Next() {
		var (
			id         int
			janCodeDB  string
			nameDB     string
			priceDB    int
			createdAt  time.Time
			updatedAt  time.Time
			disabledAt sql.NullTime
		)

		if err := rows.Scan(
			&id,
			&janCodeDB,
			&nameDB,
			&priceDB,
			&createdAt,
			&updatedAt,
			&disabledAt,
		); err != nil {
			return nil, err
		}

		// disabledAt が NULL ならゼロ値 time.Time にする
		var disabled time.Time
		if disabledAt.Valid {
			disabled = disabledAt.Time
		}

		i, err := item.NewItemFromDB(
			id,
			janCodeDB,
			nameDB,
			priceDB,
			createdAt,
			updatedAt,
			disabled,
		)
		if err != nil {
			return nil, err
		}

		items = append(items, i)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}

// SetItemDisabled は商品を無効／有効にする。すでにその状態なら changed=false（何も書かない）
func (r *ItemRepositoryImpl) SetItemDisabled(ctx context.Context, janCode string, disabled bool) (bool, bool, error) {
	executor := getExecutor(ctx, r.db)

	query := "UPDATE item SET disabled_at = NULL WHERE jan_code = ? AND disabled_at IS NOT NULL"
	if disabled {
		query = "UPDATE item SET disabled_at = CURRENT_TIMESTAMP WHERE jan_code = ? AND disabled_at IS NULL"
	}
	res, err := executor.ExecContext(ctx, query, janCode)
	if err != nil {
		return false, false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, false, err
	}
	if n > 0 {
		return true, true, nil
	}

	// 変わらなかった: 商品が無いのか、すでにその状態なのかを区別する
	var id int
	err = executor.QueryRowContext(ctx, "SELECT id FROM item WHERE jan_code = ?", janCode).Scan(&id)
	if err == sql.ErrNoRows {
		return false, false, nil
	}
	if err != nil {
		return false, false, err
	}
	return true, false, nil
}
