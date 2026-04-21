import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/store/useCartStore";
import type { Item } from "@/store/useCartStore";

const item1: Item = { item_id: 1, item_name: "コーラ", price: 100, jan_code: "111" };
const item2: Item = { item_id: 2, item_name: "お茶", price: 150, jan_code: "222" };

beforeEach(() => {
  useCartStore.setState({ cartItems: [] });
});

describe("useCartStore", () => {
  it("addItem: 新しい商品を追加できる", () => {
    useCartStore.getState().addItem(item1);
    expect(useCartStore.getState().cartItems).toEqual([{ item: item1, quantity: 1 }]);
  });

  it("addItem: 同じ商品を追加すると数量が増える", () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item1);
    expect(useCartStore.getState().cartItems[0].quantity).toBe(2);
  });

  it("addItem: 異なる商品は別エントリになる", () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item2);
    expect(useCartStore.getState().cartItems).toHaveLength(2);
  });

  it("removeItem: 指定した商品を削除できる", () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item2);
    useCartStore.getState().removeItem(1);
    expect(useCartStore.getState().cartItems).toEqual([{ item: item2, quantity: 1 }]);
  });

  it("clearCart: カートを空にできる", () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item2);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().cartItems).toEqual([]);
  });
});
