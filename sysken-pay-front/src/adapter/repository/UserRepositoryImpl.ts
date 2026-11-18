import { apiClient } from "../api/client";
import { ApiError } from "../api/ApiError";
import type { components } from "../../types/api-schema";

export const UserRepositoryImpl = {
  getUser: async (
    userId: string
  ): Promise<components["schemas"]["GetUserResponse"]> => {
    const { data, error, response } = await apiClient.GET(
      "/v1/user/{user_id}",
      {
        params: { path: { user_id: userId } },
      }
    );
    if (error) {
      throw new ApiError(
        error.message ?? "ユーザー取得に失敗しました",
        response.status
      );
    }
    if (!data?.user_id) {
      throw new ApiError("ユーザーが見つかりませんでした", response.status);
    }
    return data;
  },

  registerUser: async (
    body: components["schemas"]["PostUserRequest"]
  ): Promise<components["schemas"]["PostUserResponse"]> => {
    const { data, error, response } = await apiClient.POST("/v1/user", {
      body,
    });
    if (error) {
      throw new ApiError(
        error.message ?? "ユーザー登録に失敗しました",
        response.status
      );
    }
    return data;
  },

  updateUser: async (
    userId: string,
    body: components["schemas"]["PatchUserRequest"]
  ): Promise<components["schemas"]["PatchUserResponse"]> => {
    const { data, error, response } = await apiClient.PATCH("/v1/user/{user_id}", {
      params: { path: { user_id: userId } },
      body,
    });
    // 学籍番号がもう使われている（409）などを画面で出し分けられるように、ステータスを付けて投げる
    if (error) throw new ApiError(error.message ?? "更新に失敗しました", response?.status ?? 0);
    return data;
  },

  getBalance: async (
    userId: string
  ): Promise<components["schemas"]["GetBalanceResponse"]> => {
    const { data, error } = await apiClient.GET("/v1/user/{user_id}/balance", {
      params: { path: { user_id: userId } },
    });
    if (error) throw new Error(error.message);
    if (!data?.user_id) throw new Error("ユーザーが見つかりませんでした");
    return data;
  },
};
