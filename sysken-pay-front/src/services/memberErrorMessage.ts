import { ApiError } from "../adapter/api/ApiError";

type Action = "list" | "refund" | "stop" | "resume";

const FALLBACK: Record<Action, string> = {
  list: "ユーザー一覧を読み込めませんでした。もう一度お試しください。",
  refund: "返金できませんでした。もう一度お試しください。",
  stop: "利用停止できませんでした。もう一度お試しください。",
  resume: "利用を再開できませんでした。もう一度お試しください。",
};

/** ユーザー一覧・返金・利用停止・再開のエラーを、画面に出す日本語のメッセージにする */
export const toMemberErrorMessage = (action: Action, e: unknown): string => {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 401:
        return "管理者パスワードの確認が切れました。管理者画面からやり直してください。";
      case 404:
        return "このユーザーは登録されていません。一覧を読み込み直してください。";
      case 409:
        if (action === "refund") return "残高が 0 円なので、返金するものはありません。";
        if (action === "stop") return "このユーザーは、すでに利用停止しています。";
        if (action === "resume") return "このユーザーは利用停止していません。";
        break;
    }
  }
  return FALLBACK[action];
};
