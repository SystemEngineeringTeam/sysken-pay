import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header";
import { PayMethodButtonGroup } from "../../components/features/buy/PayMethodButton";
import Total from "../../components/features/buy/Total";
import ArrowButton from "../../components/ui/ArrowButton";
import styles from "./confirm.module.scss";

export default function BuyConfirmPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <Header title="決済方法" right="toTop" />
      <div className={styles.content}>
        <Total title="決済方法を選択してください" label="お買い上げ金額" />
        <div className={styles.payButtons}>
          <PayMethodButtonGroup />
        </div>
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/buy/list")}>
        戻る
      </ArrowButton>
    </div>
  );
}
