import { useState, useCallback } from "react";
import { ItemRepositoryImpl } from "../adapter/repository/ItemRepositoryImpl";
import type { components } from "../types/api-schema";

type Item = components["schemas"]["GetAllItemsResponse"]["items"][number];

export const useItem = () => {
  const [items, setItems] = useState<Item[]>([]);

  const fetchItems = useCallback(async () => {
    try {
      const data = await ItemRepositoryImpl.getAllItems();

      setItems(data?.items ?? []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return { items, fetchItems };
};
