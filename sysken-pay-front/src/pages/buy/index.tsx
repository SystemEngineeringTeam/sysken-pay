import type { JSX } from "react";
import { useState } from "react";
import { BarcodeReader } from "../../components/ui/BarcodeReader";
import Header from "../../components/layouts/Header";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../../store/useCartStore";
import { ItemRepositoryImpl } from "../../adapter/repository/ItemRepositoryImpl";
import ArrowButton from "../../components/ui/ArrowButton";
import styles from "./index.module.scss";

export default function Buy(): JSX.Element {
  const [mode] = useState<"product" | "member">("product");
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (barcode: string) => {
    try {
      const data = await ItemRepositoryImpl.getItemByJanCode(barcode);
      if (!data?.item_id) throw new Error("商品が見つかりませんでした");
      addItem(data);
      navigate("/buy/list");
    } catch (e) {
      setError(e instanceof Error ? e.message : "商品の取得に失敗しました");
    }
  }

  return (
    <div className={styles.container}>
      <Header title="商品購入" />
      <div className={styles.content}>
        <BarcodeReader
          mode={mode}
          onScan={handleScan}
          placeholder="商品のバーコードをかざしてください"
        />
        {error && <p>{error}</p>}
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/")}>
        戻る
      </ArrowButton>
    </div>
  );
}
