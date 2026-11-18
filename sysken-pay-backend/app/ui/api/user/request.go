package user

// PostUser Request: ユーザー新規登録のリクエスト
type PostUserRequest struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
}

// PatchUser Request: ユーザー更新のリクエスト
type PatchUserRequest struct {
	// UserID は新しい学籍番号（変えるときだけ入れる）
	UserID   string `json:"user_id,omitempty"`
	UserName string `json:"user_name"`
}
