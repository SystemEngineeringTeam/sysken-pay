import { useState, useCallback } from "react";
import { ItemRepositoryImpl } from "../adapter/repository/ItemRepositoryImpl";
import type { components } from "../types/api-schema";

type Item = NonNullable<components["schemas"]["GetAllItemsResponse"]["items"]>[number];

export const useItem = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const data = await ItemRepositoryImpl.getAllItems();
      setItems(data?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "商品一覧の取得に失敗しました");
    }
  }, []);

  return { items, error, fetchItems };
};
