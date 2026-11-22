import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "../../types/api-schema";
import { ADMIN_USER, basicAuthHeader, getAdminPassword, getAdminSession, sessionAuthHeader } from "./adminCredentials";

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

/** 管理者パスワードか、管理者バーコードの解除が済んでいるときだけ Authorization ヘッダーを付ける */
export const adminAuthMiddleware: Middleware = {
  onRequest({ request }) {
    if (request.headers.has("Authorization")) return request;
    const password = getAdminPassword();
    const session = getAdminSession();
    if (password !== null) {
      request.headers.set("Authorization", basicAuthHeader(ADMIN_USER, password));
    } else if (session !== null) {
      request.headers.set("Authorization", sessionAuthHeader(session));
    }
    return request;
  },
};

apiClient.use(adminAuthMiddleware);
