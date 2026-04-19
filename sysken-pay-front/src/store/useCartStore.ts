import { create } from "zustand";
import type { components } from "../types/api-schema";

export type Item = components["schemas"]["GetItemResponse"];

export type CartItem = {
  item: Item;
  quantity: number;
};

type CartStore = {
  cartItems: CartItem[];
  addItem: (item: Item) => void;
  removeItem: (itemId: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>((set) => ({
  cartItems: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.cartItems.find((c) => c.item.item_id === item.item_id);
      if (existing) {
        return {
          cartItems: state.cartItems.map((c) =>
            c.item.item_id === item.item_id ? { ...c, quantity: c.quantity + 1 } : c
          ),
        };
      }
      return { cartItems: [...state.cartItems, { item, quantity: 1 }] };
    }),
  removeItem: (itemId) =>
    set((state) => ({
      cartItems: state.cartItems.filter((c) => c.item.item_id !== itemId),
    })),
  clearCart: () => set({ cartItems: [] }),
}));
