import { create } from "zustand";
import type { Item } from "../types/domain/Item";
import { sampleItems } from "../mocks/sampleData";

type ItemStore = {
  items: Item[];
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  updateItem: (item: Item) => void;
  clearItems: () => void;
};

export const useItemStore = create<ItemStore>((set) => ({
  items: sampleItems, // sampleDataを初期値に APIができたら空配列
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  updateItem: (item) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === item.id ? item : i)),
    })),
  clearItems: () => set({ items: [] }),
}));
