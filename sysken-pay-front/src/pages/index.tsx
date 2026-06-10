import type { JSX } from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layouts/Header";
import { ChargeButton } from "../components/features/home/ChargeButton";
import { BarcodeReader } from "../components/ui/BarcodeReader";
import { useCartStore } from "../store/useCartStore";
import { ItemRepositoryImpl } from "../adapter/repository/ItemRepositoryImpl";
import styles from "./index.module.scss";

export default function Home(): JSX.Element {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleScan = async (barcode: string) => {
    try {
      const data = await ItemRepositoryImpl.getItemByJanCode(barcode);
      if (!data?.item_id) throw new Error("商品が見つかりませんでした。ご不明の際は担当者にご連絡ください。");
      addItem(data);
      navigate("/buy/list");
    } catch (e) {
      setError(e instanceof Error ? e.message : "商品の取得に失敗しました");
    }
  };

  return (
    <div className={styles.container}>
      <Header title="シス研Pay" right="setting" shadow={true} />
      <main className={styles.main}>
        <BarcodeReader mode="product" onScan={handleScan} />
        {error && <p className={styles.error}>{error}</p>}
        <ChargeButton />
      </main>
    </div>
  );
}
