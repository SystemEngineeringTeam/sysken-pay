import type { JSX } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarcodeReader } from "../../../components/ui/BarcodeReader";
import { usePaymentCardScan } from "../../../hooks/useBarcodeReader";
import Header from "../../../components/layouts/Header";
import Total from "../../../components/features/buy/Total";
import ArrowButton from "../../../components/ui/ArrowButton";
import styles from "./index.module.scss";

export default function PaymentStartPage(): JSX.Element {
  const { paymentMethod } = useParams();
  const navigate = useNavigate();
  // スマホのシス研Payバーコードで持ち主を確かめてから、購入確定画面へ進む
  const { onScan: handleScan, ErrorMessage } = usePaymentCardScan(`/buy/${paymentMethod}/confirm`);

  return (
    <div className={styles.container}>
      {paymentMethod === "cash" ? (
        <>
          <Header title="現金支払い" right="toTop" />
          <Total title="お金を箱に入れてください" label="合計" showButton />
        </>
      ) : (
        <>
          <Header title="シス研Pay支払い" right="toTop" />
          <div className={styles.reader}>
            <BarcodeReader
              mode="member"
              onScan={handleScan}
              placeholder="シス研Payバーコードをかざしてください"
            />
          </div>
          <ErrorMessage />
        </>
      )}
      <ArrowButton variant="prev" onClick={() => navigate("/buy/confirm")}>
        戻る
      </ArrowButton>
    </div>
  );
}
