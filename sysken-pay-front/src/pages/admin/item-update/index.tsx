import type { JSX } from "react";
import { useState } from "react";
import { BarcodeReader } from "../../../components/ui/BarcodeReader";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import { useItemStore } from "../../../store/useItemStore";
import { ItemRepositoryImpl } from "../../../adapter/repository/ItemRepositoryImpl";
import ArrowButton from "../../../components/ui/ArrowButton";
import styles from "./index.module.scss";

export default function ItemUpdatePage(): JSX.Element {
  const navigate = useNavigate();
  const setSelectedItem = useItemStore((state) => state.setSelectedItem);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (barcode: string) => {
    try {
      const data = await ItemRepositoryImpl.getItemByJanCode(barcode);
      if (!data?.item_id) throw new Error("商品が見つかりませんでした");
      setSelectedItem(data);
      navigate("/admin/item-update/info");
    } catch (e) {
      setError(e instanceof Error ? e.message : "商品の取得に失敗しました");
    }
  }

  return (
    <div className={styles.container}>
      <Header title="商品更新" />
      <div className={styles.content}>
        <BarcodeReader
          mode="product"
          onScan={handleScan}
          placeholder="商品のバーコードをかざしてください"
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/menu")}>
        戻る
      </ArrowButton>
    </div>
  );
}
