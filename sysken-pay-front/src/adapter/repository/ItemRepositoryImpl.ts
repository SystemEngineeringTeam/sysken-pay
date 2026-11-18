import { apiClient } from "../api/client";
import { ApiError } from "../api/ApiError";
import type { components } from "../../types/api-schema";

export const ItemRepositoryImpl = {
  getAllItems: async () => {
    const { data, error } = await apiClient.GET("/v1/item");
    if (error) throw new Error(error.message);
    return data;
  },

  getItemByJanCode: async (janCode: string) => {
    const { data, error, response } = await apiClient.GET("/v1/item/{jan_code}", {
      params: { path: { jan_code: janCode } },
    });
    // 404（未登録）と 400（読み取りミス）を画面で区別できるように、ステータスを付けて投げる
    if (error) throw new ApiError(error.message ?? "商品の取得に失敗しました", response.status);
    return data;
  },

  registerItem: async (body: components["schemas"]["PostItemRequest"]) => {
    const { data, error } = await apiClient.POST("/v1/item", { body });
    if (error) throw new Error(error.message);
    return data;
  },

  updateItem: async (body: components["schemas"]["PatchItemRequest"]) => {
    const { data, error } = await apiClient.PATCH("/v1/item", { body });
    if (error) throw new Error(error.message);
    return data;
  },
};
