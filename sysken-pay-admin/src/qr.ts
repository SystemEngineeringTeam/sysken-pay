// 支払い用バーコード（HRI）をスマホに渡す QR。行き先は静的サイト sysken-pay-qr。
// HRI は「#」のあと（フラグメント）に入れる。サーバーに送られないので、ホスティング先のログに残らない。

/** QR を表示している時間（秒）。過ぎたら消す（docs/phone-payment.md） */
export const QR_DISPLAY_SECONDS = 120;

/** QR の行き先（スマホで開く静的サイト） */
export const QR_ENDPOINT = "https://qr.pay.sysken.net";

export const buildQrUrl = (endpoint: string, code: string): string => `${endpoint.replace(/[#/]+$/, "")}/#a=${encodeURIComponent(code)}`;

/** 残り秒数を「1:05」の形にする */
export const formatRemaining = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
