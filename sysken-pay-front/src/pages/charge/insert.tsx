import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import ArrowButton from "../../components/ui/ArrowButton";
import { PriceLabel } from "../../components/ui/PriceLabel";
import { useChargeStore } from "../../store/useChargeStore";
import { useBalanceStore } from "../../store/useBalanceStore";
import styles from "./insert.module.scss";

export default function ChargeInsertPage(): JSX.Element {
  const navigate = useNavigate();
  const chargeAmount = useChargeStore((state) => state.chargeAmount);
  const setBalance = useBalanceStore((state) => state.setBalance);

  function handleNext(barcode: string) {
    // TODO: APIから残高を参照
    setBalance({ userId: barcode, balance: 550 });
    navigate("/charge/complete");
  }

  return (
    <div className={styles.container}>
      <Header title="チャージ金額" />
      <div className={styles.content}>
        <div className={styles.instruction}>箱にお金を入れてください</div>
        <PriceLabel label="チャージ金額" price={chargeAmount} />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/charge/select")}>
        戻る
      </ArrowButton>
      <ArrowButton variant="next" onClick={() => handleNext("user123")}>
        完了
      </ArrowButton>
    </div>
  );
}
