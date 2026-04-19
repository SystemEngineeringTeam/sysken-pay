import { create } from "zustand";
import type { components } from "../types/api-schema";

export type Item = NonNullable<components["schemas"]["GetAllItemsResponse"]["items"]>[number];

type ItemStore = {
  items: Item[];
  setItems: (items: Item[]) => void;
  clearItems: () => void;
  selectedItem: Item | null;
  setSelectedItem: (item: Item | null) => void;
};

export const useItemStore = create<ItemStore>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  clearItems: () => set({ items: [] }),
  selectedItem: null,
  setSelectedItem: (item) => set({ selectedItem: item }),
}));
