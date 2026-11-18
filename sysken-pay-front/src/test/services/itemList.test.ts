import { describe, expect, it } from "vitest";
import { searchItems, sortItems } from "../../services/itemList";

const items = [
  { item_id: 1, item_name: "ポテトチップス", jan_code: "4901330000001", price: 150 },
  { item_id: 2, item_name: "おにぎり", jan_code: "4901330000002", price: 120 },
  { item_id: 3, item_name: "Coffee", jan_code: "4901330000003", price: 100 },
];

describe("searchItems", () => {
  it("商品名と JAN で探す", () => {
    expect(searchItems(items, "ポテト").map((i) => i.item_id)).toEqual([1]);
    expect(searchItems(items, "coffee").map((i) => i.item_id)).toEqual([3]);
    expect(searchItems(items, "0002").map((i) => i.item_id)).toEqual([2]);
    expect(searchItems(items, "")).toHaveLength(3);
  });
});

describe("sortItems", () => {
  it("商品名の順にする（元の配列は変えない）", () => {
    const sorted = sortItems(items);
    expect(sorted.map((i) => i.item_name)).toEqual(["Coffee", "おにぎり", "ポテトチップス"]);
    expect(items[0].item_id).toBe(1);
  });
});
