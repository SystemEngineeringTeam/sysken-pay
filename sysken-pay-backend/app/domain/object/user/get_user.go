package user

import "time"

//TODO モデル（データベースから取得する型を宣言する）
//データベースの制約通りになるようにエラーハンドリングをガチる
//ユーザーID、名前、作成日時、更新日時など

func NewUserFromDB(
	userID string,
	userName string,
	createdAt time.Time,
	updatedAt time.Time,
	deletedAt time.Time,
) (*User, error) {
	user, err := NewUser(userID, userName)
	if err != nil {
		return nil, err
	}

	if err := user.SetCreatedAt(createdAt); err != nil {
		return nil, err
	}
	if err := user.SetUpdatedAt(updatedAt); err != nil {
		return nil, err
	}
	if !deletedAt.IsZero() {
		if err := user.SetDeletedAt(deletedAt); err != nil {
			return nil, err
		}
	}

	return user, nil
}
