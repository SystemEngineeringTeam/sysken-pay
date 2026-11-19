import type { JSX } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import Total from "../../../components/features/buy/Total";
import ArrowButton from "../../../components/ui/ArrowButton";
import styles from "./index.module.scss";

/**
 * 現金で払う画面（/buy/cash）。
 * シス研Pay はカートの画面でバーコードをかざすだけで払えるので、ここには来ない
 */
export default function PaymentStartPage(): JSX.Element {
  const { paymentMethod } = useParams();
  const navigate = useNavigate();

  if (paymentMethod !== "cash") {
    return <Navigate to="/buy/list" replace />;
  }

  return (
    <div className={styles.container}>
      <Header title="現金支払い" right="toTop" />
      <Total title="お金を箱に入れてください" label="合計" showButton />
      <ArrowButton variant="prev" onClick={() => navigate("/buy/list")}>
        戻る
      </ArrowButton>
    </div>
  );
}
