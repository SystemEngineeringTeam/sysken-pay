import { describe, it, expect } from "vitest";
import { CartService } from "./CartService";
import type { CartItem } from "../store/useCartStore";

const makeCartItem = (item_id: number, price: number, quantity: number): CartItem => ({
  item: { item_id, item_name: `商品${item_id}`, price, jan_code: "0000000000000" },
  quantity,
});

describe("CartService", () => {
  describe("calcTotal", () => {
    it("カートが空のとき0を返す", () => {
      expect(CartService.calcTotal([])).toBe(0);
    });

    it("1種類の商品の合計金額を計算する", () => {
      const items = [makeCartItem(1, 100, 3)];
      expect(CartService.calcTotal(items)).toBe(300);
    });

    it("複数種類の商品の合計金額を計算する", () => {
      const items = [makeCartItem(1, 100, 2), makeCartItem(2, 150, 1)];
      expect(CartService.calcTotal(items)).toBe(350);
    });

    it("priceがundefinedのとき0として扱う", () => {
      const items: CartItem[] = [{ item: { item_id: 1 }, quantity: 3 }];
      expect(CartService.calcTotal(items)).toBe(0);
    });
  });

  describe("toApiItems", () => {
    it("CartItemをAPIリクエスト形式に変換する", () => {
      const items = [makeCartItem(1, 100, 2), makeCartItem(2, 200, 1)];
      expect(CartService.toApiItems(items)).toEqual([
        { item_id: 1, quantity: 2 },
        { item_id: 2, quantity: 1 },
      ]);
    });

    it("item_idがundefinedのとき0になる", () => {
      const items: CartItem[] = [{ item: { price: 100 }, quantity: 1 }];
      expect(CartService.toApiItems(items)).toEqual([{ item_id: 0, quantity: 1 }]);
    });
  });
});
