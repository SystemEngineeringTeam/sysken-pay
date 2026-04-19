import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import Button from "../../../components/ui/Button";
import ArrowButton from "../../../components/ui/ArrowButton";
import SysPayConfirm from "../../../components/features/buy/SysPayConfirm";
import { useTotalPrice } from "../../../hooks/useTotalPrice";
import styles from "./confirm.module.scss";

export default function SysPayConfirmPage(): JSX.Element {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  // TODO: APIからユーザーの残高を取得
  const balance = 1000;
  const totalPrice = useTotalPrice();

  function handlePurchase() {
    if (balance < totalPrice) {
      setErrorMessage(
        `残高が不足しています（不足額: ￥${totalPrice - balance}）`
      );
      return;
    }
    setErrorMessage("");
    navigate("/buy/complete");
  }

  return (
    <div className={styles.container}>
      <Header title="購入確定" right="toTop" />
      <div className={styles.content}>
        <SysPayConfirm balance={balance} />
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      </div>
      <div className={styles.buttonWrapper}>
        <Button onClick={handlePurchase}>購入</Button>
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/buy/syspay")}>
        戻る
      </ArrowButton>
    </div>
  );
}
