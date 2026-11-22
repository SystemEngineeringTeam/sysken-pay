// JAN コード（EAN-8 / EAN-13）の整形と検証。画面に依存しない関数だけを置く。

// 数字以外（空白・ハイフンなど）を取り除く
export const normalizeJan = (raw: string): string => raw.replace(/\D/g, "");

// チェックデジット（末尾1桁）が正しいか。右から2桁目を重み 3、次を 1、…と交互にかける
const hasValidCheckDigit = (digits: string): boolean => {
  const body = digits.slice(0, -1);
  const sum = [...body].reverse().reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
};

// 8桁または13桁の数字で、チェックデジットが合っていれば true（バックエンドと同じ条件）
export const isValidJan = (jan: string): boolean => /^(\d{8}|\d{13})$/.test(jan) && hasValidCheckDigit(jan);
