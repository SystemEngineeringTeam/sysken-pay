import { apiClient } from "../api/client";
import { ApiError } from "../api/ApiError";
import type { components } from "../../types/api-schema";

export type Member = components["schemas"]["Member"];

/**
 * ユーザー一覧と、退部・卒業のとき（返金・利用停止・再開）、停止中の人の整理（非表示・削除）。どれも管理者パスワードが必要。
 * 設計は docs/phone-payment.md の「退部・卒業」
 */
export const MemberRepositoryImpl = {
  /** 全員（止めた人も含む）を、残高・状態つきで返す */
  list: async (): Promise<Member[]> => {
    const { data, error, response } = await apiClient.GET("/v1/user");
    if (error || !data || !("users" in data)) {
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

  /** 停止中で残高 0 の人を、一覧から非表示にする（記録は消さない） */
  hide: async (userId: string): Promise<void> => {
    const { data, error, response } = await apiClient.POST("/v1/user/{user_id}/hide", {
      params: { path: { user_id: userId } },
    });
    if (error || !data) {
      throw new ApiError(error?.message ?? "非表示にできませんでした", response.status);
    }
  },

  /** 非表示を解除する（停止中の一覧に戻る） */
  unhide: async (userId: string): Promise<void> => {
    const { data, error, response } = await apiClient.POST("/v1/user/{user_id}/unhide", {
      params: { path: { user_id: userId } },
    });
    if (error || !data) {
      throw new ApiError(error?.message ?? "非表示を解除できませんでした", response.status);
    }
  },

  /** 停止中で、購入・チャージ・返金の記録が1件もない人を消す（取り消せない） */
  remove: async (userId: string): Promise<void> => {
    const { data, error, response } = await apiClient.DELETE("/v1/user/{user_id}", {
      params: { path: { user_id: userId } },
    });
    if (error || !data) {
      throw new ApiError(error?.message ?? "削除できませんでした", response.status);
    }
  },
};
