import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useItemStore } from "../../store/useItemStore";
import Button from "../../components/ui/Button";
import styles from "./complete.module.scss";

export default function BuyCompletePage(): JSX.Element {
  const navigate = useNavigate();
  const clearItems = useItemStore((state) => state.clearItems);

  function handleHome() {
    clearItems();
    navigate("/");
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>お買い上げありがとうございました！</h1>
      <p className={styles.message}>
        ご不明点や商品のご希望がありましたら、〇〇までお申し付けください
        <br />
        またのご利用お待ちしております
      </p>
      <Button size="lg" onClick={handleHome}>
        ホームへ戻る
      </Button>
    </div>
  );
}
