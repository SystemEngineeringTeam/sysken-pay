import { ApiError } from "../adapter/api/ApiError";

/** 利用停止した人（退部・卒業）が読み取ったときに出す文（API は 403） */
export const USER_STOPPED_MESSAGE = "利用停止されています。役員に伝えてください。";

/** 管理者画面で、利用停止した人を読み取ったときに出す文 */
export const ADMIN_USER_STOPPED_MESSAGE =
  "このユーザーは利用停止しています。「ユーザー一覧」から「利用を再開」してください。";

/** シス研Payバーコードを読み取ったときのエラーを、画面に出す日本語のメッセージにする */
export const toUserScanErrorMessage = (e: unknown): string => {
  if (e instanceof ApiError) {
    if (e.status === 403) return USER_STOPPED_MESSAGE;
    if (e.status === 404) return "登録されていないバーコードです。担当者にご連絡ください。";
    if (e.status === 400) return "シス研Payバーコードを読み取れませんでした。もう一度かざしてください。";
  }
  return "ユーザーの取得に失敗しました";
};
