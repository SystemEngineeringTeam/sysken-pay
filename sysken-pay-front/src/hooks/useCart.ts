import { useCallback } from "react";
import { useCartStore } from "../store/useCartStore";
import type { Item } from "../store/useCartStore";
import { useBalanceStore } from "../store/useBalanceStore";
import { PurchaseRepositoryImpl } from "../adapter/repository/PurchaseRepositoryImpl";

export const useCart = () => {
  const { cartItems, addItem, removeItem, clearCart } = useCartStore();
  const { setBalance } = useBalanceStore();

  const totalPrice = cartItems.reduce(
    (sum, { item, quantity }) => sum + (item.price ?? 0) * quantity,
    0
  );

  const checkout = useCallback(
    async (userId: string) => {
      const items = cartItems.map(({ item, quantity }) => ({
        item_id: item.item_id ?? 0,
        quantity,
      }));

      const data = await PurchaseRepositoryImpl.createPurchase(userId, { items });

      if (data.balance !== undefined && data.user_id) {
        setBalance({ user_id: data.user_id, balance: data.balance });
      }
      clearCart();
      return data;
    },
    [cartItems, clearCart, setBalance]
  );

  const scanItem = useCallback(
    (item: Item) => addItem(item),
    [addItem]
  );

  return { cartItems, totalPrice, scanItem, removeItem, clearCart, checkout };
};
