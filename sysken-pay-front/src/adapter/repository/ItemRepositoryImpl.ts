import { apiClient } from "../api/client";

export const ItemRepositoryImpl = {
  getAllItems: async () => {
    const { data, error } = await apiClient.GET("/v1/item");
    if (error) throw new Error(error.message);
    return data;
  },

  getItemByJanCode: async (janCode: string) => {
    const { data, error } = await apiClient.GET("/v1/item/{jan_code}", {
      params: {
        path: { jan_code: janCode },
      },
    });
    if (error) throw new Error(error.message);
    return data;
  },
};
