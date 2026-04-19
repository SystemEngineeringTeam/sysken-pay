import { apiClient } from "../api/client";
import type { components } from "../../types/api-schema";

export const PurchaseRepositoryImpl = {
  createPurchase: async (
    userId: string,
    body: components["schemas"]["PostPurchaseRequest"]
  ): Promise<components["schemas"]["PostPurchaseResponse"]> => {
    const { data, error } = await apiClient.POST(
      "/v1/user/{user_id}/purchase",
      {
        params: { path: { user_id: userId } },
        body,
      }
    );
    if (error) throw new Error(error.message);
    return data;
  },

  cancelPurchase: async (
    userId: string,
    body: components["schemas"]["PostPurchaseCancelRequest"]
  ): Promise<components["schemas"]["PostPurchaseCancelResponse"]> => {
    const { data, error } = await apiClient.POST(
      "/v1/user/{user_id}/purchase/cancel",
      {
        params: { path: { user_id: userId } },
        body,
      }
    );
    if (error) throw new Error(error.message);
    return data;
  },
};
