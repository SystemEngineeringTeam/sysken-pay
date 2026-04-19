import { apiClient } from "../api/client";
import type { components } from "../../types/api-schema";

export const ChargeRepositoryImpl = {
  chargeAmount: async (
    userId: string,
    body: components["schemas"]["PostChargeRequest"]
  ): Promise<components["schemas"]["ChargeResponse"]> => {
    const { data, error } = await apiClient.POST("/v1/user/{user_id}/charge", {
      params: { path: { user_id: userId } },
      body,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  chargeCancel: async (
    userId: string,
    body: components["schemas"]["PostChargeCancelRequest"]
  ): Promise<components["schemas"]["ChargeCancelResponse"]> => {
    const { data, error } = await apiClient.POST(
      "/v1/user/{user_id}/charge/cancel",
      {
        params: { path: { user_id: userId } },
        body,
      }
    );
    if (error) throw new Error(error.message);
    return data;
  },
};
