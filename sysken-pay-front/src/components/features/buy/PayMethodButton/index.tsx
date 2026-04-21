import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PayMethodButton.module.scss";

export function PayMethodButtonGroup(): JSX.Element {
  return (
    <div className={styles.group}>
      <PayMethodButton type="cash" />
      <PayMethodButton type="syskenpay" />
    </div>
  );
}

interface PayMethodButtonProps {
  type: "cash" | "syskenpay";
}

function PayMethodButton({ type }: PayMethodButtonProps): JSX.Element {
  const navigate = useNavigate();
  const isCash = type === "cash";

  function handleClick() {
    navigate(isCash ? "/buy/cash" : "/buy/syskenpay");
  }

  return (
    <button
      className={isCash ? styles.cashButton : styles.syskenpayButton}
      onClick={handleClick}
    >
      <div className={styles.content}>
        <img
          src={isCash ? "/icons/Cash.svg" : "/icons/BlueBarcode.svg"}
          alt={isCash ? "Cash" : "SyskenPay"}
          className={isCash ? styles.cashIcon : styles.syskenpayIcon}
        />
        {isCash ? <span className={styles.cashLabel}>現金</span> : <span className={styles.syskenpayLabel}>シス研Pay</span>}
      </div>
      <img src="/icons/LeftArrow.svg" alt="arrow" className={styles.arrow} />
    </button>
  );
}