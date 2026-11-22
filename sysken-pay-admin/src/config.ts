// 通信先（バックエンド）。ログイン画面のプルダウンで選ぶ。選択はこのブラウザに保存する。
// このページは HTTPS で配信されるので、ブラウザの制限（混在コンテンツ）により、
// 公開ページから呼べるのは HTTPS の通信先だけ（手元で pnpm dev するときの http://localhost は例外）。
// 通信先を足すときは、ここと index.html の CSP（connect-src）の両方に足す。
export const API_TARGETS = [
  { id: "lan", label: "ローカルネットワーク（sysken-pay.local）", base: "https://sysken-pay.local" },
  { id: "local", label: "ローカル（この PC の localhost:8080）", base: "http://localhost:8080" },
] as const;

export type ApiTargetId = (typeof API_TARGETS)[number]["id"];

export const DEFAULT_TARGET: ApiTargetId = "lan";

// バックエンドの管理者ユーザー名（ADMIN_USER の既定値）
export const ADMIN_USER = "admin";

export const DEFAULT_API_BASE = API_TARGETS.find((t) => t.id === DEFAULT_TARGET)!.base;

const STORAGE_KEY = "sysken-pay-admin:api-target";

/** 文字列が通信先の id ならそれを、そうでなければ null */
export const parseTargetId = (raw: string | null): ApiTargetId | null => API_TARGETS.find((t) => t.id === raw)?.id ?? null;

export const baseOf = (id: ApiTargetId): string => API_TARGETS.find((t) => t.id === id)!.base;

export const loadTarget = (storage: Pick<Storage, "getItem"> = localStorage): ApiTargetId => {
  try {
    return parseTargetId(storage.getItem(STORAGE_KEY)) ?? DEFAULT_TARGET;
  } catch {
    return DEFAULT_TARGET;
  }
};

export const saveTarget = (id: ApiTargetId, storage: Pick<Storage, "setItem"> = localStorage): void => {
  try {
    storage.setItem(STORAGE_KEY, id);
  } catch {
    // 保存できなくても、このページを開いている間は使える
  }
};

// Entra ID（Microsoft アカウントでのログイン）。どちらも秘密ではない ID（ビルド時に VITE_ENTRA_* で渡す）。
// 空のままなら「Microsoft でログイン」は出さず、パスワードだけで入る。
export const ENTRA = {
  tenantId: (import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined) ?? "",
  clientId: (import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined) ?? "",
};

export const entraConfigured = (e: { tenantId: string; clientId: string } = ENTRA): boolean => e.tenantId !== "" && e.clientId !== "";

// システムアカウント。許可リストに最初から入っていて、外せない（バックエンドの aitid.SystemAccountUPN と同じ値）
export const SYSTEM_ACCOUNT_UPN = "sysken@aitech.ac.jp";

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
