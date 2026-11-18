import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "../../types/api-schema";
import { ADMIN_USER, basicAuthHeader, getAdminPassword } from "./adminCredentials";

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

/** 管理者パスワードが確認済みのときだけ Authorization ヘッダーを付ける */
export const adminAuthMiddleware: Middleware = {
  onRequest({ request }) {
    const password = getAdminPassword();
    if (password !== null && !request.headers.has("Authorization")) {
      request.headers.set("Authorization", basicAuthHeader(ADMIN_USER, password));
    }
    return request;
  },
};

apiClient.use(adminAuthMiddleware);
