import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { CompletionModal } from "../../../components/ui/CompletionModal";
import Header from "../../../components/layouts/Header";
import { useItemStore } from "../../../store/useItemStore";
import { ItemRepositoryImpl } from "../../../adapter/repository/ItemRepositoryImpl";
import ArrowButton from "../../../components/ui/ArrowButton";
import styles from "./info.module.scss";

export default function ItemUpdateInfoPage(): JSX.Element {
  const navigate = useNavigate();
  const selectedItem = useItemStore((state) => state.selectedItem);

  const [name, setName] = useState(selectedItem?.item_name ?? "");
  const [price, setPrice] = useState(String(selectedItem?.price ?? ""));
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; price?: string; api?: string }>({});

  const handleRegister = async () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "商品名を入力してください";
    const parsedPrice = Number(price);
    if (!price.trim()) {
      newErrors.price = "値段を入力してください";
    } else if (isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = "1円以上の値段を入力してください";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    try {
      await ItemRepositoryImpl.updateItem({
        jan_code: selectedItem?.jan_code ?? "",
        item_name: name,
        price: parsedPrice,
      });
      setErrors({});
      setShowModal(true);
    } catch (e) {
      setErrors({ api: e instanceof Error ? e.message : "更新に失敗しました" });
    }
  }

  return (
    <div className={styles.container}>
      <Header title="商品更新" />
      <div className={styles.content}>
        <div className={styles.formGroup}>
          <Input label="JANコード" value={selectedItem?.jan_code ?? ""} isDisabled />
          <div className={styles.row}>
            <div className={styles.field}>
              <Input label="商品名" placeholder="コーラ" value={name} onChange={setName} />
              {errors.name && <p className={styles.error}>{errors.name}</p>}
            </div>
            <div className={styles.field}>
              <Input label="値段" placeholder="100" value={price} onChange={setPrice} />
              {errors.price && <p className={styles.error}>{errors.price}</p>}
            </div>
          </div>
          {errors.api && <p className={styles.error}>{errors.api}</p>}
        </div>
      </div>
      <div className={styles.buttonWrapper}>
        <Button size="md" onClick={handleRegister}>更新</Button>
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/item-update")}>
        戻る
      </ArrowButton>
      {showModal && (
        <CompletionModal
          mode="itemUpdate"
          name={name}
          price={Number(price)}
          onClose={() => navigate("/admin/menu")}
        />
      )}
    </div>
  );
}
