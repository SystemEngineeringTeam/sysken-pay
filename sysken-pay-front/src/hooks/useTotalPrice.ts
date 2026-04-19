import { useCartStore } from "../store/useCartStore";

export const useTotalPrice = () => {
  const cartItems = useCartStore((state) => state.cartItems);
  return cartItems.reduce((sum, { item, quantity }) => sum + (item.price ?? 0) * quantity, 0);
};
