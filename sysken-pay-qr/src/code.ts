// 支払い用文字列（SP7Q2K…）の読み取りと整形。画面に依存しない関数だけを置く（code.test.ts でテストする）。

// docs/phone-payment.md「支払い用バーコードの仕様」: SP + 英大文字と数字16文字（0 O 1 I を除く）
const CODE_PATTERN = /^SP[2-9A-HJ-NP-Z]{16}$/;

// 空白・ハイフン・小文字を取り除く（サーバーの照合と同じ扱い）
export const normalize = (raw: string): string => raw.replace(/[\s-]/g, "").toUpperCase();

export const isValid = (code: string): boolean => CODE_PATTERN.test(code);

// バーコードの下に出す文字（HRI）。SP のあとを4文字ずつ区切る: SP 7Q2K X9MD RA4T W8YZ
export const display = (code: string): string => `SP ${(code.slice(2).match(/.{4}/g) ?? []).join(" ")}`;

// location.hash（例: "#a=SP7Q2K…"）から支払い用文字列を取り出す。無い・形が違うときは null
export const fromHash = (hash: string): string | null => {
  const m = /(?:^#|&)a=([^&]*)/.exec(hash);
  if (!m) return null;
  let raw: string;
  try {
    raw = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  const code = normalize(raw);
  return isValid(code) ? code : null;
};
