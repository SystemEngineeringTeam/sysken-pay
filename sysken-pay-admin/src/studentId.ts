// 学籍番号（PoC の形: X24042）と、DB の user.id・大学のアカウント（UPN）の対応。
// バックエンドの aitid（app/domain/object/aitid）と同じ決まり。決まった形のものだけ変換し、一般化しない。
// DB の user.id は、学籍番号の前に "20" を付けた形（20X24042）。

const MAJORS = "EVCBMPDSALTHKX";
const STUDENT_ID = new RegExp(`^[${MAJORS}]2\\d{4}$`);
const DOMAIN = "aitech.ac.jp";

/** 学籍番号を検証して大文字にそろえる（前後の空白は無視）。形が違えば null */
export const parseStudentId = (s: string): string | null => {
  const id = s.trim().toUpperCase();
  return STUDENT_ID.test(id) ? id : null;
};

/** DB の user.id にする（"20" を前に付ける）。例: X24042 → 20X24042 */
export const toUserId = (studentId: string): string | null => {
  const id = parseStudentId(studentId);
  return id ? `20${id}` : null;
};

/** UPN にする。例: X24042 → x24042xx@aitech.ac.jp */
export const toUpn = (studentId: string): string | null => {
  const id = parseStudentId(studentId);
  if (!id) return null;
  const major = id[0].toLowerCase();
  return `${id.toLowerCase()}${major}${major}@${DOMAIN}`;
};
