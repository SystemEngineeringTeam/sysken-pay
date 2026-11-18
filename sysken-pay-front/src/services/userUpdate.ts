import { ApiError } from "../adapter/api/ApiError";

/** 学籍番号の形（例: 24K01234）。サーバーと同じ決まり */
const STUDENT_ID = /^\d{2}[A-Za-z]\d+$/;

/** 学籍番号の形が正しいか（20文字まで） */
export const isValidStudentId = (id: string): boolean => {
  const v = id.trim();
  return v.length <= 20 && STUDENT_ID.test(v);
};

/** ユーザー更新のエラーを、画面に出す日本語のメッセージにする */
export const toUserUpdateErrorMessage = (e: unknown): string => {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 400:
        return "学籍番号か名前の形が正しくありません。学籍番号は「24K01234」の形で入れてください。";
      case 401:
        return "管理者パスワードの確認が切れました。管理者画面からやり直してください。";
      case 404:
        return "このユーザーは登録されていません。もう一度読み取ってください。";
      case 409:
        return "この学籍番号は、もう別のユーザーで登録されています。";
    }
  }
  return "更新に失敗しました。もう一度お試しください。";
};
