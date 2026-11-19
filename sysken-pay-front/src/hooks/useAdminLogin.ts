import { useCallback, useState } from "react";
import { AuthRepositoryImpl } from "../adapter/repository/AuthRepositoryImpl";
import type { PasswordKind } from "../adapter/repository/AuthRepositoryImpl";

/**
 * 管理者画面・チャージの画面のパスワード確認。
 * kind="charge" はチャージ用パスワードか管理者パスワードで通る。"admin" は管理者パスワードだけ
 */
export const useAdminLogin = (kind: PasswordKind = "admin") => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const ok = await AuthRepositoryImpl.verify(kind, password);
      if (!ok) setError("パスワードが違います");
      return ok;
    } catch {
      setError("サーバーに接続できません");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [kind]);

  const clearError = useCallback(() => setError(null), []);

  return { login, isLoading, error, clearError };
};
