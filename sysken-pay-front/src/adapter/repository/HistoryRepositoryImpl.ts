import { apiClient } from "../api/client";
import type { components, operations } from "../../types/api-schema";

export const HistoryRepositoryImpl = {
  getPurchaseHistories: async (
    userId: string,
    query?: operations["getPurchaseHistories"]["parameters"]["query"]
  ): Promise<components["schemas"]["GetPurchaseHistoriesResponse"]> => {
    const { data, error } = await apiClient.GET(
      "/v1/user/{user_id}/history",
      {
        params: {
          path: { user_id: userId },
          query,
        },
      }
    );
    if (error) throw new Error(error.message);
    return data;
  },
};
