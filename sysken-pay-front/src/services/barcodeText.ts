/** 全角で入ってきた英数字を半角にする（日本語入力がオンのままリーダーで読んだとき） */
export const toHalfWidth = (str: string): string =>
  str.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
