import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import styles from "./complete.module.scss";

export default function BuyCompletePage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>お買い上げありがとうございました！</h1>
      <p className={styles.message}>
        ご不明点や商品のご希望がありましたら、x24042_提髪までお申し付けください
        <br />
        またのご利用お待ちしております！
      </p>
      <Button size="lg" onClick={() => navigate("/")}>
        ホームへ戻る
      </Button>
    </div>
  );
}
