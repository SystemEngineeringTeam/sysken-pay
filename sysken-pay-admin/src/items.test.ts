import { describe, expect, it } from "vitest";
import { countItems, filterItems, searchItems, sortItems } from "./items";

const a = { item_id: 1, jan_code: "4901777018884", item_name: "お茶", price: 150, disabled: false };
const b = { item_id: 2, jan_code: "4902102072618", item_name: "Cola", price: 120, disabled: false };

describe("items", () => {
  it("名前か JAN で探す", () => {
    expect(searchItems([a, b], "cola")).toEqual([b]);
    expect(searchItems([a, b], "49017")).toEqual([a]);
    expect(searchItems([a, b], "")).toEqual([a, b]);
  });
  it("並べ替えで元の配列を変えない", () => {
    const src = [a, b];
    sortItems(src);
    expect(src).toEqual([a, b]);
  });
});

describe("有効／無効のタブ", () => {
  const off = { ...b, disabled: true };
  it("タブで分ける", () => {
    expect(filterItems([a, off], "enabled")).toEqual([a]);
    expect(filterItems([a, off], "disabled")).toEqual([off]);
  });
  it("disabled が無い商品は有効として扱う", () => {
    const old = { item_id: 3, jan_code: "4902102072595", item_name: "古い", price: 10 } as typeof a;
    expect(filterItems([old], "enabled")).toEqual([old]);
  });
  it("件数", () => {
    expect(countItems([a, off, off])).toEqual({ enabled: 1, disabled: 2 });
    expect(countItems([])).toEqual({ enabled: 0, disabled: 0 });
  });
});
