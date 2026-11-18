import { ApiError } from "../adapter/api/ApiError";

type Action = "list" | "refund" | "stop" | "resume" | "hide" | "unhide" | "delete";

const FALLBACK: Record<Action, string> = {
  list: "ユーザー一覧を読み込めませんでした。もう一度お試しください。",
  refund: "返金できませんでした。もう一度お試しください。",
  stop: "利用停止できませんでした。もう一度お試しください。",
  resume: "利用を再開できませんでした。もう一度お試しください。",
  hide: "非表示にできませんでした。もう一度お試しください。",
  unhide: "非表示を解除できませんでした。もう一度お試しください。",
  delete: "削除できませんでした。もう一度お試しください。",
};

/** ユーザー一覧・返金・利用停止・再開・非表示・削除のエラーを、画面に出す日本語のメッセージにする */
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
        if (action === "hide") return "非表示にできるのは、利用停止していて残高が 0 円の人だけです。";
        if (action === "unhide") return "このユーザーは非表示にしていません。";
        if (action === "delete") return "購入・チャージ・返金の記録がある人は削除できません。非表示にしてください。";
        break;
    }
  }
  return FALLBACK[action];
};
