import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import type { PurchaseResult } from "../../hooks/useBarcodeReader";
import { formatYen } from "../../services/memberList";
import styles from "./complete.module.scss";

/** 完了画面を出しておく秒数。過ぎたらホームに戻る（次の人がすぐ使えるように） */
const COMPLETE_SECONDS = 5;

const toResult = (state: unknown): PurchaseResult | null => {
  if (typeof state !== "object" || state === null) return null;
  const s = state as Record<string, unknown>;
  if (typeof s.userName !== "string" || typeof s.total !== "number" || typeof s.balance !== "number") {
    return null;
  }
  return { userName: s.userName, total: s.total, balance: s.balance };
};

export default function BuyCompletePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  // シス研Payで払ったときだけ、名前・金額・残高がある（現金のときは無い）
  const result = toResult(location.state);
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
      <h1 className={styles.title}>お買い上げありがとうございました！</h1>
      {result && (
        <div className={styles.result}>
          <p className={styles.name}>{result.userName} さん</p>
          <p className={styles.amounts}>
            <span>お支払い {formatYen(result.total)}</span>
            <span className={styles.balance}>残高 {formatYen(result.balance)}</span>
          </p>
        </div>
      )}
      <p className={styles.message}>
        ご不明点や商品のご希望がありましたら、x24042_提髪までお申し付けください
        <br />
        またのご利用お待ちしております！
      </p>
      <Button size="lg" onClick={() => navigate("/")}>
        ホームへ戻る（{remaining}）
      </Button>
    </div>
  );
}
