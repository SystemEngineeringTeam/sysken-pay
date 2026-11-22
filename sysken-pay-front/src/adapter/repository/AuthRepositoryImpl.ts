import { apiClient } from "../api/client";
import { ApiError } from "../api/ApiError";
import { ADMIN_USER, basicAuthHeader, clearAdminAccess, getAdminSession, setAdminPassword, setAdminSession } from "../api/adminCredentials";

/** どの画面のパスワードか。admin＝管理者画面（全部できる）、charge＝チャージの画面（チャージだけ） */
export type PasswordKind = "admin" | "charge";

const VERIFY_PATH = {
  admin: "/v1/admin/verify",
  charge: "/v1/charge/verify",
} as const;

/**
 * パスワードが正しいかをバックエンドに確かめる。
 * 正しければ以降のリクエストで使えるようにメモリに保持し、true を返す。
 * 違えば false。サーバーに届かない・その他のエラーは例外を投げる。
 * チャージの画面は、チャージ用パスワードでも管理者パスワードでも通る（バックエンドが決める）
 */
const verify = async (kind: PasswordKind, password: string): Promise<boolean> => {
  const { response } = await apiClient.GET(VERIFY_PATH[kind], {
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
};

/**
 * 管理者のシス研Payバーコード（HRI）で解除する。POST /v1/admin/unlock（認証なし）。
 * 管理者なら合言葉をメモリに保持する（パスワードの代わり）。管理者でない・使えないバーコードは ApiError（status 付き）
 */
const unlock = async (hri: string): Promise<void> => {
  const { data, error, response } = await apiClient.POST("/v1/admin/unlock", { body: { hri } });
  if (!data?.token) {
    throw new ApiError(error?.message ?? "管理者のバーコードを確かめられませんでした", response.status);
  }
  setAdminSession(data.token);
};

/** ホームに戻ったとき：解除の合言葉をサーバーでも取り消し、パスワードと一緒にメモリから消す（届かなくても消す） */
const lock = async (): Promise<void> => {
  const hadSession = getAdminSession() !== null;
  try {
    if (hadSession) await apiClient.DELETE("/v1/admin/unlock");
  } catch {
    // サーバーに届かなくても、こちらでは忘れる（サーバー側は時間で切れる）
  } finally {
    clearAdminAccess();
  }
};

export const AuthRepositoryImpl = {
  verify,
  unlock,
  lock,
  /** 管理者画面のパスワード */
  verifyAdmin: (password: string): Promise<boolean> => verify("admin", password),
  /** チャージの画面のパスワード（チャージ用パスワードか管理者パスワード） */
  verifyCharge: (password: string): Promise<boolean> => verify("charge", password),
};
