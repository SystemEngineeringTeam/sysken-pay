import { describe, expect, it } from "vitest";
import { MAX_PRICE, parseItem } from "./form";

const ok = { jan: "4901777018884", name: "お茶", price: "150" };

describe("parseItem", () => {
  it("正しい入力を Item にする（名前は前後の空白を除く）", () => {
    expect(parseItem({ ...ok, name: "  お茶 " })).toEqual({
      ok: true,
      item: { jan_code: "4901777018884", item_name: "お茶", price: 150 },
    });
  });
  it("値段 0 は許す", () => {
    expect(parseItem({ ...ok, price: "0" })).toMatchObject({ ok: true });
  });
  it("全角数字の値段を半角にそろえる", () => {
    expect(parseItem({ ...ok, price: "１５０" })).toMatchObject({ ok: true, item: { price: 150 } });
  });
  it.each(["-1", "1.5", "1e3", "", "abc", " "])("値段 %j を断る", (price) => {
    expect(parseItem({ ...ok, price }).ok).toBe(false);
  });
  it("上限を超える値段を断る", () => {
    expect(parseItem({ ...ok, price: String(MAX_PRICE) }).ok).toBe(true);
    expect(parseItem({ ...ok, price: String(MAX_PRICE + 1) }).ok).toBe(false);
  });
  it("空の商品名・不正な JAN を断る", () => {
    expect(parseItem({ ...ok, name: "   " }).ok).toBe(false);
    expect(parseItem({ ...ok, jan: "4901777018885" }).ok).toBe(false);
  });
});
