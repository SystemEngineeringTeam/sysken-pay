// 商品一覧の検索と並び順。
import type { ListedItem } from "./api";

/** 商品名か JAN コードに、検索の文字が入っている商品だけにする（大文字・小文字は区別しない） */
export const searchItems = (items: ListedItem[], query: string): ListedItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((i) => i.item_name.toLowerCase().includes(q) || i.jan_code.includes(q));
};

export type ItemTab = "enabled" | "disabled";

export const ITEM_TABS: { key: ItemTab; label: string }[] = [
  { key: "enabled", label: "有効" },
  { key: "disabled", label: "無効" },
];

/** タブに合う商品だけにする。disabled が無い（古い API の）商品は有効として扱う */
export const filterItems = (items: ListedItem[], tab: ItemTab): ListedItem[] =>
  items.filter((i) => (tab === "disabled") === (i.disabled === true));

export const countItems = (items: ListedItem[]): Record<ItemTab, number> => ({
  enabled: filterItems(items, "enabled").length,
  disabled: filterItems(items, "disabled").length,
});

/** 商品名の五十音順 */
export const sortItems = (items: ListedItem[]): ListedItem[] =>
  [...items].sort((a, b) => a.item_name.localeCompare(b.item_name, "ja"));
