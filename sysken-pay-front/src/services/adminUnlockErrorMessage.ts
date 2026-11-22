import { ApiError } from "../adapter/api/ApiError";

/** 管理者のシス研Payバーコードで解除しようとして失敗したときの、画面に出す日本語のメッセージ */
export const toAdminUnlockErrorMessage = (e: ApiError): string => {
  switch (e.status) {
    case 400:
      return "バーコードを読み取れませんでした。もう一度かざすか、パスワードを入力してください。";
    case 403:
      return "管理者として登録されていないバーコードです。パスワードを入力してください。";
    case 404:
      return "使えないバーコードです。パスワードを入力してください。";
    case 429:
      return "読み取りの失敗が続いたため、1分ほど止めています。パスワードを入力するか、少し待ってください。";
    default:
      return "サーバーに接続できません";
  }
};
