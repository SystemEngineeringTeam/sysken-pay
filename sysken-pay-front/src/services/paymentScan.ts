import { ApiError } from "../adapter/api/ApiError";
import { USER_STOPPED_MESSAGE } from "./userScanErrorMessage";

/** 学籍番号の形（例: 24K01234）。支払い・チャージの画面で学生証を読んだときに気づくため */
const STUDENT_ID = /^\d{2}[A-Za-z]\d+$/;

/** 読み取った文字が学生証の学籍番号か */
export const isStudentId = (code: string): boolean => STUDENT_ID.test(code.trim());

/**
 * 読み取った文字が支払い用バーコード（SP から始まる18文字）に見えるか。
 * 空白・ハイフン・小文字は、サーバーと同じように無視する（docs/phone-payment.md の「支払い用バーコードの仕様」）
 */
export const looksLikePaymentCode = (code: string): boolean => {
  const normalized = code.replace(/[\s-]/g, "").toUpperCase();
  return /^SP[0-9A-Z]{16}$/.test(normalized);
};

export const STUDENT_ID_NOT_ACCEPTED =
  "学生証は使えません。スマホに保存したシス研Payバーコードをかざしてください。";

/** ホーム画面（商品の読み取り）で支払い用バーコードを読んだときの案内 */
export const PAYMENT_CODE_ON_HOME =
  "これは支払い用のバーコードです。先に商品をかざしてから、シス研Payバーコードをかざしてください。";

/** カートが空のときに支払い用バーコードを読んだときの案内 */
export const CART_EMPTY_ON_PAY = "先に商品をかざしてから、シス研Payバーコードをかざしてください。";

/** 残高が足りないときの案内（不足額と今の残高を出す） */
export const insufficientBalanceMessage = (balance: number, total: number): string =>
  `残高が ¥${(total - balance).toLocaleString("ja-JP")} 足りません（残高 ¥${balance.toLocaleString("ja-JP")}）。チャージしてから、もう一度かざしてください。`;

/** 支払い・チャージでシス研Payバーコードを読み取ったときのエラーを、画面に出す日本語のメッセージにする */
export const toPaymentScanErrorMessage = (e: unknown): string => {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 400:
        return "シス研Payバーコードを読み取れませんでした。もう一度かざしてください。";
      case 403:
        return USER_STOPPED_MESSAGE;
      case 404:
        return "使えないバーコードです。作り直した人は、新しいバーコードをかざしてください。";
      case 429:
        return "読み取りの失敗が続いたため、1分ほど止めています。少し待ってからかざしてください。";
    }
  }
  return "シス研Payバーコードを確かめられませんでした。もう一度かざしてください。";
};
