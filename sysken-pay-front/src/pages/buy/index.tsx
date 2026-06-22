import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import { BarcodeReader } from "../../components/ui/BarcodeReader";
import Header from "../../components/layouts/Header";
import ArrowButton from "../../components/ui/ArrowButton";
import { useProductScan } from "../../hooks/useBarcodeReader";
import styles from "./index.module.scss";

export default function Buy(): JSX.Element {
  const navigate = useNavigate();
  const { onScan, ErrorMessage } = useProductScan();

  return (
    <div className={styles.container}>
      <Header title="商品購入" />
      <div className={styles.content}>
        <BarcodeReader
          mode="product"
          onScan={onScan}
          placeholder="商品のバーコードをかざしてください"
        />
        <ErrorMessage />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/")}>
        戻る
      </ArrowButton>
    </div>
  );
}
