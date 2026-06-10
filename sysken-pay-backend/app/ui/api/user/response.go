package user

import (
	"sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/ui/api/pkg/timefmt"
)

type PostUserResponse struct {
	Status    string `json:"status"`
	UserID    string `json:"user_id"`
	UserName  string `json:"user_name"`
	CreatedAt string `json:"created_at"`
}

func toPostUserResponse(user *user.User) *PostUserResponse {
	return &PostUserResponse{
		Status:    "success",
		UserID:    user.ID(),
		UserName:  user.UserName(),
		CreatedAt: timefmt.JST(user.CreatedAt()),
	}
}

type GetUserResponse struct {
	Status    string `json:"status"`
	UserID    string `json:"user_id"`
	UserName  string `json:"user_name"`
	CreatedAt string `json:"created_at"`
}

func toGetUserResponse(user *user.User) *GetUserResponse {
	return &GetUserResponse{
		Status:    "success",
		UserID:    user.ID(),
		UserName:  user.UserName(),
		CreatedAt: timefmt.JST(user.CreatedAt()),
	}
}

type PatchUserResponse struct {
	Status    string `json:"status"`
	UserID    string `json:"user_id"`
	UserName  string `json:"user_name"`
	CreatedAt string `json:"created_at"`
}

func toPatchUserResponse(user *user.User) *PatchUserResponse {
	return &PatchUserResponse{
		Status:    "success",
		UserID:    user.ID(),
		UserName:  user.UserName(),
		CreatedAt: timefmt.JST(user.CreatedAt()),
	}
}
