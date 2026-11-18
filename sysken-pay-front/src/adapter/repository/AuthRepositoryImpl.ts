import { apiClient } from "../api/client";
import { ApiError } from "../api/ApiError";
import { ADMIN_USER, basicAuthHeader, setAdminPassword } from "../api/adminCredentials";

export const AuthRepositoryImpl = {
  /**
   * 管理者パスワードが正しいかをバックエンドに確かめる。
   * 正しければ以降のリクエストで使えるようにメモリに保持し、true を返す。
   * 違えば false。サーバーに届かない・その他のエラーは例外を投げる。
   */
  verifyAdmin: async (password: string): Promise<boolean> => {
    const { response } = await apiClient.GET("/v1/admin/verify", {
      headers: { Authorization: basicAuthHeader(ADMIN_USER, password) },
    });
    if (response.status === 204) {
      setAdminPassword(password);
      return true;
    }
    if (response.status === 401) {
      return false;
    }
    throw new ApiError("パスワードの確認に失敗しました", response.status);
  },
};
