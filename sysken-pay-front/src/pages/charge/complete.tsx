import type { JSX } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { useBalanceStore } from "../../store/useBalanceStore";
import { useChargeStore } from "../../store/useChargeStore";
import styles from "./complete.module.scss";

export default function ChargeCompletePage(): JSX.Element {
  const navigate = useNavigate();
  const balance = useBalanceStore((state) => state.balance?.balance ?? 0);
  const clearChargeAmount = useChargeStore((state) => state.clearChargeAmount);

  useEffect(() => {
    clearChargeAmount();
  }, [clearChargeAmount]);

  function handleHome() {
    navigate("/");
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.title}>チャージが完了しました</div>
        <div className={styles.balance}>現在のカード残高  ￥{balance}</div>
        <Button onClick={handleHome}>ホームへ戻る</Button>
      </div>
    </div>
  );
}
