/**
 * 管理者パスワード（BASIC 認証）をメモリにだけ持つ。
 *
 * - パスワードはビルド成果物にも localStorage にも残さない
 * - 管理者画面・チャージ画面でパスワードが確認できたら set し、ホームに戻ったら clear する
 * - set されている間だけ、apiClient がすべてのリクエストに Authorization ヘッダーを付ける
 */
export const ADMIN_USER = "admin";

let adminPassword: string | null = null;

export const setAdminPassword = (password: string): void => {
  adminPassword = password;
};

export const clearAdminPassword = (): void => {
  adminPassword = null;
};

export const getAdminPassword = (): string | null => adminPassword;

/** BASIC 認証のヘッダー値を作る（日本語などの UTF-8 文字も扱えるようにする） */
export const basicAuthHeader = (user: string, password: string): string => {
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return `Basic ${btoa(binary)}`;
};
