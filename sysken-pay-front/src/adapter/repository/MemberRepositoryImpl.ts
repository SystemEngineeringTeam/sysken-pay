import { apiClient } from "../api/client";
import { ApiError } from "../api/ApiError";
import type { components } from "../../types/api-schema";

export type Member = components["schemas"]["Member"];

/**
 * ユーザー一覧と、退部・卒業のとき（返金・利用停止・再開）。どれも管理者パスワードが必要。
 * 設計は docs/phone-payment.md の「退部・卒業」
 */
export const MemberRepositoryImpl = {
  /** 全員（止めた人も含む）を、残高・状態つきで返す */
  list: async (): Promise<Member[]> => {
    const { data, error, response } = await apiClient.GET("/v1/user");
    if (error || !data) {
      throw new ApiError(error?.message ?? "ユーザー一覧を取得できませんでした", response.status);
    }
    return data.users;
  },

  /** 残高ちょうどを返金する。返した額を返す */
  refund: async (userId: string): Promise<number> => {
    const { data, error, response } = await apiClient.POST("/v1/user/{user_id}/refund", {
      params: { path: { user_id: userId } },
    });
    if (error || !data) {
      throw new ApiError(error?.message ?? "返金できませんでした", response.status);
    }
    return data.refunded_amount;
  },

  /** 利用停止にする（支払い用バーコードも使えなくなる）。残っている残高を返す */
  stop: async (userId: string): Promise<number> => {
    const { data, error, response } = await apiClient.POST("/v1/user/{user_id}/stop", {
      params: { path: { user_id: userId } },
    });
    if (error || !data) {
      throw new ApiError(error?.message ?? "利用停止できませんでした", response.status);
    }
    return data.balance;
  },

  /** 利用停止を解除する（このあと支払い用バーコードを発行し直す） */
  resume: async (userId: string): Promise<void> => {
    const { data, error, response } = await apiClient.POST("/v1/user/{user_id}/resume", {
      params: { path: { user_id: userId } },
    });
    if (error || !data) {
      throw new ApiError(error?.message ?? "利用を再開できませんでした", response.status);
    }
  },
};
