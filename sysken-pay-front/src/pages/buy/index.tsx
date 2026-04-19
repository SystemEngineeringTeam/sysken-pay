import type { JSX } from "react";
import { useState } from "react";
import { BarcodeReader } from "../../components/ui/BarcodeReader";
import Header from "../../components/layouts/Header";
import { useNavigate } from "react-router-dom";
import { useItemStore } from "../../store/useItemStore";
import ArrowButton from "../../components/ui/ArrowButton";
import styles from "./index.module.scss";

export default function Buy(): JSX.Element {
  const [mode] = useState<"product" | "member">("product");
  const navigate = useNavigate();
  const addItem = useItemStore((state) => state.addItem);

  function handleScan(barcode: string) {
    // TODO: barcodeを使ってAPIから商品情報を取得してaddItem
    addItem({
      id: barcode,
      name: "商品名",
      price: 100,
      janCode: barcode,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    navigate("/buy/list");
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
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/")}>
        戻る
      </ArrowButton>
    </div>
  );
}
