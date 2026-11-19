import { apiClient } from "../api/client";
import { ApiError } from "../api/ApiError";
import type { components } from "../../types/api-schema";

export type IssuedHri = components["schemas"]["IssueHriResponse"];
export type ResolvedUser = components["schemas"]["ResolveHriResponse"];

/** HRI（支払い用バーコードの文字列。docs/phone-payment.md）の発行と照合。API は user のエンドポイント */
export const PaymentCardRepositoryImpl = {
  /**
   * 読み取った HRI から持ち主を調べる（支払い・チャージのとき）。GET /v1/user?hri=SP…（認証なし）。
   * HRI は URL に載る。ブラウザの履歴には残らない（fetch なので）が、サーバー側のログには残さないこと
   */
  resolve: async (hri: string): Promise<ResolvedUser> => {
    const { data, error, response } = await apiClient.GET("/v1/user", { params: { query: { hri } } });
    if (error || !data || !("user_id" in data)) {
      throw new ApiError(error?.message ?? "支払い用バーコードを確かめられませんでした", response.status);
    }
    return data;
  },

  /**
   * HRI を発行する（作り直し）。古いものは使えなくなる。管理者パスワードが必要。
   * 返ってくる hri はこのときにしか取り出せない
   */
  issue: async (userId: string): Promise<IssuedHri> => {
    const { data, error, response } = await apiClient.POST("/v1/user/{user_id}/hri", {
      params: { path: { user_id: userId } },
    });
    if (error || !data) {
      throw new ApiError(error?.message ?? "支払い用バーコードを発行できませんでした", response.status);
    }
    return data;
  },
};
