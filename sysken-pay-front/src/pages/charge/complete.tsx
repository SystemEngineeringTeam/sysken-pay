import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { useBalanceStore } from "../../store/useBalanceStore";
import { useChargeStore } from "../../store/useChargeStore";
import styles from "./complete.module.scss";

/** 完了画面を出しておく秒数。過ぎたらホームに戻る（次の人がすぐ使えるように） */
const COMPLETE_SECONDS = 5;

export default function ChargeCompletePage(): JSX.Element {
  const navigate = useNavigate();
  const balance = useBalanceStore((state) => state.balance?.balance ?? 0);
  const clearChargeAmount = useChargeStore((state) => state.clearChargeAmount);

  useEffect(() => {
    clearChargeAmount();
  }, [clearChargeAmount]);

  const [remaining, setRemaining] = useState(COMPLETE_SECONDS);

  useEffect(() => {
    if (remaining <= 0) {
      navigate("/");
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.title}>チャージが完了しました</div>
        <div className={styles.balance}>現在のカード残高  ￥{balance}</div>
        <Button size="lg" onClick={() => navigate("/")}>
          ホームへ戻る（{remaining}）
        </Button>
      </div>
    </div>
  );
}
