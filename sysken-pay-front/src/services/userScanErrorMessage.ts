import { ApiError } from "../adapter/api/ApiError";

/** シス研Payバーコードを読み取ったときのエラーを、画面に出す日本語のメッセージにする */
export const toUserScanErrorMessage = (e: unknown): string => {
  if (e instanceof ApiError) {
    if (e.status === 404) return "登録されていないバーコードです。担当者にご連絡ください。";
    if (e.status === 400) return "シス研Payバーコードを読み取れませんでした。もう一度かざしてください。";
  }
  return "ユーザーの取得に失敗しました";
};
