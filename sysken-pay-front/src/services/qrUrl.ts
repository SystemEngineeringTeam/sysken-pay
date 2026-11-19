/** QR を表示している時間（秒）。過ぎたら QR を消す（docs/phone-payment.md の「発行方式の変更」） */
export const QR_DISPLAY_SECONDS = 120;

/**
 * 環境変数 VITE_QR_ENDPOINT（例: qr.pay.sysken.net）を、末尾の「/」や「#」を除いた
 * `https://…` の形にする。スキームが無ければ https を付ける。未設定なら null
 */
export const normalizeQrEndpoint = (endpoint: string | undefined): string | null => {
  const trimmed = (endpoint ?? "").trim().replace(/[#/]+$/, "");
  if (trimmed === "") return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/**
 * スマホで読む QR に入れる URL を作る。
 * 支払い用文字列は「#」のあと（フラグメント）に入れる。サーバーに送られないので、
 * ホスティング先のアクセスログに残らない
 */
export const buildQrUrl = (endpoint: string, code: string): string =>
  `${endpoint}/#a=${encodeURIComponent(code)}`;

/** 設定されている QR のエンドポイント（`.env` の VITE_QR_ENDPOINT）。未設定なら null */
export const getQrEndpoint = (): string | null => normalizeQrEndpoint(import.meta.env.VITE_QR_ENDPOINT);
