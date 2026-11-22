import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import type { BalanceView } from "../hooks/useBarcodeReader";
import { formatYen } from "../services/memberList";
import styles from "./balance.module.scss";

/** 残高を出しておく秒数。過ぎたらホームに戻る（次の人がすぐ使えるように） */
const BALANCE_SECONDS = 5;

const toView = (state: unknown): BalanceView | null => {
  if (typeof state !== "object" || state === null) return null;
  const s = state as Record<string, unknown>;
  if (typeof s.userName !== "string" || typeof s.balance !== "number") return null;
  return { userName: s.userName, balance: s.balance };
};

/** ホームでシス研Payバーコードをかざしたときの、残高の画面 */
export default function BalancePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const view = toView(location.state);
  const [remaining, setRemaining] = useState(BALANCE_SECONDS);

  useEffect(() => {
    if (!view || remaining <= 0) {
      navigate("/", { replace: true });
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [view, remaining, navigate]);

  if (!view) return <div className={styles.container} />;

  return (
    <div className={styles.container}>
      <p className={styles.name}>{view.userName} さん</p>
      <p className={styles.label}>残高</p>
      <p className={styles.balance}>{formatYen(view.balance)}</p>
      <Button size="lg" onClick={() => navigate("/")}>
        ホームへ戻る（{remaining}）
      </Button>
    </div>
  );
}
