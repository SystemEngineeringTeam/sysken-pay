// 商品の入力欄の検証。画面に依存しない関数だけを置く。
import { isValidJan, normalizeJan } from "./jan";

export type Item = { jan_code: string; item_name: string; price: number };

export type ParseResult = { ok: true; item: Item } | { ok: false; message: string };

// 金額の上限（打ち間違い対策。INT に収まる範囲より十分小さくする）
export const MAX_PRICE = 100000;

export const parseItem = (input: { jan: string; name: string; price: string }): ParseResult => {
  const jan = normalizeJan(input.jan);
  if (!isValidJan(jan)) {
    return { ok: false, message: "JAN コードが正しくありません（8桁または13桁の数字）。" };
  }
  const name = input.name.trim();
  if (name === "") {
    return { ok: false, message: "商品名を入力してください。" };
  }
  // 全角数字は半角にそろえる。小数・負の数・指数表記は受け付けない
  const priceText = input.price.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  if (!/^\d+$/.test(priceText)) {
    return { ok: false, message: "値段は 0 以上の整数で入力してください。" };
  }
  const price = Number(priceText);
  if (price > MAX_PRICE) {
    return { ok: false, message: `値段は ${MAX_PRICE} 円以下で入力してください。` };
  }
  return { ok: true, item: { jan_code: jan, item_name: name, price } };
};
