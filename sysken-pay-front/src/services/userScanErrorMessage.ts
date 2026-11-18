import { ApiError } from "../adapter/api/ApiError";

/** 学生証を読み取ったときのエラーを、画面に出す日本語のメッセージにする */
export const toUserScanErrorMessage = (e: unknown): string => {
  if (e instanceof ApiError) {
    if (e.status === 404) return "登録されていない学生証です。担当者にご連絡ください。";
    if (e.status === 400) return "学生証のバーコードを読み取れませんでした。もう一度かざしてください。";
  }
  return "ユーザーの取得に失敗しました";
};
