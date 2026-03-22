import { useItemStore } from "../store/useItemStore";

export const useTotalPrice = () => {
  const items = useItemStore((state) => state.items);
  return items.reduce((sum, item) => sum + item.price, 0);
};
