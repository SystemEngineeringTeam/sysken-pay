/**
 * スマホ登録の画面に、ほかの画面から渡す情報（react-router の state）。
 * ユーザー登録が終わったら、学生証を読み直さずにそのまま QR を出すために使う。
 */
export interface PhoneRegisterState {
  /** 支払い用バーコードを発行する人の学籍番号 */
  userId: string;
  /** ユーザー登録から続けて来たとき true（「登録しました」と出す） */
  justRegistered?: boolean;
}

/** location.state から、スマホ登録の情報を取り出す。形が違えば null */
export const toPhoneRegisterState = (state: unknown): PhoneRegisterState | null => {
  if (typeof state !== "object" || state === null) return null;
  const { userId, justRegistered } = state as Record<string, unknown>;
  if (typeof userId !== "string" || userId.trim() === "") return null;
  return { userId, justRegistered: justRegistered === true };
};
