import type { CartItem } from "../store/useCartStore";

export const CartService = {
  calcTotal: (cartItems: CartItem[]): number =>
    cartItems.reduce((sum, { item, quantity }) => sum + (item.price ?? 0) * quantity, 0),

  toApiItems: (cartItems: CartItem[]): { item_id: number; quantity: number }[] =>
    cartItems.map(({ item, quantity }) => ({
      item_id: item.item_id ?? 0,
      quantity,
    })),
};
