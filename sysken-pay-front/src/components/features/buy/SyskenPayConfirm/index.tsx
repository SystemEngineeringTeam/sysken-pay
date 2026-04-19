import { useTotalPrice } from "../../../../hooks/useTotalPrice";
import { PriceLabel } from "../../../ui/PriceLabel";
import styles from "./SyskenPayConfirm.module.scss";

interface SyskenPayConfirmProps {
  balance: number; // シスPay残高
}

export default function SyskenPayConfirm({ balance }: SyskenPayConfirmProps) {
  const totalPrice = useTotalPrice();
  const shortage = Math.max(0, totalPrice - balance); // 不足額
  const remaining = Math.max(0, balance - totalPrice); // 支払い後残高

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>ご購入確定</h2>
      <div className={styles.card}>
        <PriceLabel label="シスPay" price={balance} />
        <PriceLabel label="合計" price={totalPrice} />
        <div className={shortage > 0 ? styles.shortage : ""}>
          <PriceLabel label="不足額" price={shortage} />
        </div>
      </div>
      <div className={styles.remaining}>
        <PriceLabel label="シスPay残高" price={remaining} />
      </div>
    </div>
  );
}