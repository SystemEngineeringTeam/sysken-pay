import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import ArrowButton from "../../../components/ui/ArrowButton";
import { ItemRepositoryImpl } from "../../../adapter/repository/ItemRepositoryImpl";
import { useItemStore } from "../../../store/useItemStore";
import type { Item } from "../../../store/useItemStore";
import { formatYen } from "../../../services/memberList";
import { searchItems, sortItems } from "../../../services/itemList";
import styles from "../user-list/index.module.scss";

/** 商品一覧。タップでその商品の更新（名前・値段）へ進む */
export default function ItemListPage(): JSX.Element {
  const navigate = useNavigate();
  const items = useItemStore((s) => s.items);
  const setItems = useItemStore((s) => s.setItems);
  const setSelectedItem = useItemStore((s) => s.setSelectedItem);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ItemRepositoryImpl.getAllItems()
      .then((data) => {
        if (!cancelled) setItems(data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("商品一覧を読み込めませんでした。もう一度お試しください。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setItems]);

  const shown = useMemo(() => searchItems(sortItems(items), query), [items, query]);

  const open = (item: Item) => {
    setSelectedItem(item);
    navigate("/admin/item-update/info");
  };

  return (
    <div className={styles.container}>
      <Header title="商品一覧" />

      <div className={styles.toolbar}>
        <p className={styles.total}>{items.length} 件</p>
        <div className={styles.search}>
          <input
            type="search"
            className={styles.searchInput}
            aria-label="商品名か JAN コードで探す"
            placeholder="商品名・JAN コード"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className={`${styles.message} ${styles.messageError}`} role="status">
          {error}
        </p>
      )}

      <ul className={styles.list}>
        {loading && items.length === 0 && <li className={styles.empty}>読み込んでいます…</li>}
        {!loading && shown.length === 0 && (
          <li className={styles.empty}>{query ? "見つかりませんでした" : "まだ商品が登録されていません"}</li>
        )}
        {shown.map((item) => (
          <li key={item.item_id}>
            <button type="button" className={styles.row} onClick={() => open(item)}>
              <span className={styles.who}>
                <span className={styles.name}>{item.item_name}</span>
                <span className={styles.id}>{item.jan_code}</span>
              </span>
              <span className={styles.balance}>{formatYen(item.price ?? 0)}</span>
              <span className={styles.chevron} aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>

      <ArrowButton variant="prev" onClick={() => navigate("/admin/item-menu")}>
        戻る
      </ArrowButton>
    </div>
  );
}
