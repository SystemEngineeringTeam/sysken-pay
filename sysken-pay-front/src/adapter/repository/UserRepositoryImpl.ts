import { apiClient } from "../api/client";
import type { components } from "../../types/api-schema";

export const UserRepositoryImpl = {
  registerUser: async (
    body: components["schemas"]["PostUserRequest"]
  ): Promise<components["schemas"]["PostUserResponse"]> => {
    const { data, error } = await apiClient.POST("/v1/user", { body });
    if (error) throw new Error(error.message);
    return data;
  },

  updateUser: async (
    userId: string,
    body: components["schemas"]["PatchUserRequest"]
  ): Promise<components["schemas"]["PatchUserResponse"]> => {
    const { data, error } = await apiClient.PATCH("/v1/user/{user_id}", {
      params: { path: { user_id: userId } },
      body,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  getBalance: async (
    userId: string
  ): Promise<components["schemas"]["GetBalanceResponse"]> => {
    const { data, error } = await apiClient.GET("/v1/user/{user_id}/balance", {
      params: { path: { user_id: userId } },
    });
    if (error) throw new Error(error.message);
    return data;
  },
};
