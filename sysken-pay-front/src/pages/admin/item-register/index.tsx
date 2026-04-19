import type { JSX } from "react";

import { BarcodeReader } from "../../../components/ui/BarcodeReader";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import { useItemStore } from "../../../store/useItemStore";
import { ItemRepositoryImpl } from "../../../adapter/repository/ItemRepositoryImpl";
import ArrowButton from "../../../components/ui/ArrowButton";
import styles from "./index.module.scss";

export default function ItemRegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const setSelectedItem = useItemStore((state) => state.setSelectedItem);
  async function handleScan(barcode: string) {
    try {
      const data = await ItemRepositoryImpl.getItemByJanCode(barcode);
      setSelectedItem(data ?? { jan_code: barcode });
    } catch {
      setSelectedItem({ jan_code: barcode });
    } finally {
      navigate("/admin/item-register/info");
    }
  }

  return (
    <div className={styles.container}>
      <Header title="商品登録" />
      <div className={styles.content}>
        <BarcodeReader
          mode="product"
          onScan={handleScan}
          placeholder="商品のバーコードをかざしてください"
        />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/menu")}>
        戻る
      </ArrowButton>
    </div>
  );
}
