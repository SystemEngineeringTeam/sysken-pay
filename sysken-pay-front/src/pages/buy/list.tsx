import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ItemList } from "../../components/features/buy/ItemList";
import { useCartStore } from "../../store/useCartStore";
import Header from "../../components/layouts/Header";
import ArrowButton from "../../components/ui/ArrowButton";
import styles from "./list.module.scss";

export default function BuyListPage(): JSX.Element {
  const navigate = useNavigate();
  const { cartItems: items, removeItem, clearCart } = useCartStore();
  const [errorMessage, setErrorMessage] = useState("");

  const handleNext = () => {
    if (items.length === 0) {
      setErrorMessage("商品を1点以上スキャンしてください");
      return;
    }
    setErrorMessage("");
    navigate("/buy/confirm");
  }

  return (
    <div className={styles.container}>
      <Header title="商品購入" right="toTop" />
      <div className={styles.content}>
        <ItemList Items={items} onDelete={removeItem} />
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      </div>
      <ArrowButton variant="prev" onClick={() => { clearCart(); navigate("/buy"); }}>
        戻る
      </ArrowButton>
      <ArrowButton variant="next" onClick={handleNext}>
        次へ
      </ArrowButton>
    </div>
  );
}
