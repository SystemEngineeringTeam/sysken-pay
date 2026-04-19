import type { JSX } from "react";
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

  async function handleScan(barcode: string) {
    try {
      const data = await ItemRepositoryImpl.getItemByJanCode(barcode);
      if (!data?.item_id) throw new Error("商品が見つかりませんでした");
      setSelectedItem(data);
      navigate("/admin/item-update/info");
    } catch (e) {
      console.error(e);
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
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/menu")}>
        戻る
      </ArrowButton>
    </div>
  );
}
