import type { Item } from "../store/useItemStore";

/** 商品名か JAN コードに、検索の文字が入っている商品だけにする（大文字・小文字は区別しない） */
export const searchItems = (items: Item[], query: string): Item[] => {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (i) => (i.item_name ?? "").toLowerCase().includes(q) || (i.jan_code ?? "").includes(q),
  );
};

/** 一覧に出す順（商品名の五十音順） */
export const sortItems = (items: Item[]): Item[] =>
  [...items].sort((a, b) => (a.item_name ?? "").localeCompare(b.item_name ?? "", "ja"));
