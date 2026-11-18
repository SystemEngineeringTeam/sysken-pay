import { apiClient } from "../api/client";
import { ApiError } from "../api/ApiError";
import type { components } from "../../types/api-schema";

export type CreatedClaim = components["schemas"]["CreatePaymentCardClaimResponse"];
export type ClaimStatus = components["schemas"]["PaymentCardClaimStatusResponse"];

/** 支払い用バーコード（docs/phone-payment.md） */
export const PaymentCardRepositoryImpl = {
  /** 支払い用バーコードを発行して、スマホ登録用の QR（5分だけ有効）を作る。管理者パスワードが必要 */
  createClaim: async (userId: string): Promise<CreatedClaim> => {
    const { data, error, response } = await apiClient.POST(
      "/v1/user/{user_id}/payment-card/claim",
      { params: { path: { user_id: userId } } }
    );
    if (error || !data) {
      throw new ApiError(error?.message ?? "スマホ登録の QR を作れませんでした", response.status);
    }
    return data;
  },

  /** スマホ登録用の QR の状態（開かれた回数・残り時間）。管理者パスワードが必要 */
  getClaimStatus: async (claimId: number): Promise<ClaimStatus> => {
    const { data, error, response } = await apiClient.GET(
      "/v1/payment-card/claim/{claim_id}",
      { params: { path: { claim_id: claimId } } }
    );
    if (error || !data) {
      throw new ApiError(error?.message ?? "QR の状態を取得できませんでした", response.status);
    }
    return data;
  },
};
