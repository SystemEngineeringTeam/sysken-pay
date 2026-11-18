import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import ArrowButton from "../../components/ui/ArrowButton";
import { PriceLabel } from "../../components/ui/PriceLabel";
import { useChargeStore } from "../../store/useChargeStore";
import { useBalanceStore } from "../../store/useBalanceStore";
import { ChargeRepositoryImpl } from "../../adapter/repository/ChargeRepositoryImpl";
import { isChargeAmount } from "../../services/chargeAmounts";
import styles from "./insert.module.scss";

export default function ChargeInsertPage(): JSX.Element {
  const navigate = useNavigate();
  const chargeAmount = useChargeStore((state) => state.chargeAmount);
  const balance = useBalanceStore((state) => state.balance);
  const setBalance = useBalanceStore((state) => state.setBalance);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    const userId = balance?.user_id;
    if (!userId) {
      setError("ユーザー情報が見つかりません");
      return;
    }
    if (!isChargeAmount(chargeAmount)) {
      setError("チャージ金額をもう一度選んでください");
      return;
    }
    try {
      const data = await ChargeRepositoryImpl.chargeAmount(userId, {
        amount: chargeAmount,
      });
      if (data.balance !== undefined && data.user_id) {
        setBalance({ user_id: data.user_id, balance: data.balance });
      }
      navigate("/charge/complete");
    } catch (e) {
      // サーバーの英語メッセージはそのまま出さない
      console.error(e);
      setError("チャージに失敗しました。もう一度お試しください");
    }
  }

  return (
    <div className={styles.container}>
      <Header title="チャージ金額" />
      <div className={styles.content}>
        <div className={styles.instruction}>箱にお金を入れてください</div>
        <PriceLabel label="チャージ金額" price={chargeAmount} />
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/charge/select")}>
        戻る
      </ArrowButton>
      <ArrowButton variant="next" onClick={handleNext}>
        完了
      </ArrowButton>
    </div>
  );
}
