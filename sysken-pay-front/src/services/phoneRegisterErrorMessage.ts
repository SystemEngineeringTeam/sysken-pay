import { ApiError } from "../adapter/api/ApiError";

/** スマホ登録（発行用 QR を作る）ときのエラーを、画面に出す日本語のメッセージにする */
export const toPhoneRegisterErrorMessage = (e: unknown): string => {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 403:
        return "このユーザーは利用停止しています。「ユーザー一覧」から「利用を再開」してください。";
      case 404:
        return "登録されていない学生証です。先にユーザー登録をしてください。";
      case 400:
        return "学生証のバーコードを読み取れませんでした。もう一度かざしてください。";
      case 401:
        return "管理者パスワードの確認が切れました。管理者画面からやり直してください。";
      case 503:
        return "QR に入れる URL が設定されていません。バックエンドの .env の PUBLIC_BASE_URL を設定してください。";
    }
  }
  return "QR を作れませんでした。もう一度お試しください。";
};

/** 残り秒数を「4:05」の形にする */
export const formatRemaining = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
