import { useCallback, useState } from "react";
import { AuthRepositoryImpl } from "../adapter/repository/AuthRepositoryImpl";

/** 管理者・チャージ画面のパスワード確認 */
export const useAdminLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const ok = await AuthRepositoryImpl.verifyAdmin(password);
      if (!ok) setError("パスワードが違います");
      return ok;
    } catch {
      setError("サーバーに接続できません");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { login, isLoading, error, clearError };
};
