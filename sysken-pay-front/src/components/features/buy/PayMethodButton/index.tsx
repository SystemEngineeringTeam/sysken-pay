import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PayMethodButton.module.scss";

const ICONS_BASE = "https://raw.githubusercontent.com/sana-sagegami/sysken-pay/main/public/icons";

export function PayMethodButtonGroup(): JSX.Element {
  return (
    <div className={styles.group}>
      <PayMethodButton type="cash" />
      <PayMethodButton type="syspay" />
    </div>
  );
}

interface PayMethodButtonProps {
  type: "cash" | "syspay";
}

function PayMethodButton({ type }: PayMethodButtonProps): JSX.Element {
  const navigate = useNavigate();
  const isCash = type === "cash";

  function handleClick() {
    navigate(isCash ? "/buy/cash" : "/buy/syspay");
  }

  return (
    <button
      className={isCash ? styles.cashButton : styles.syspayButton}
      onClick={handleClick}
    >
      <div className={styles.content}>
        <img
          src={isCash ? `${ICONS_BASE}/Cash.svg` : `${ICONS_BASE}/BlueBarcode.svg`}
          alt={isCash ? "Cash" : "SysPay"}
          className={isCash ? styles.cashIcon : styles.syspayIcon}
        />
        {isCash ? "現金" : "シス研Pay"}
      </div>
      <img
        src={`${ICONS_BASE}/LeftArrow.svg`}
        alt="arrow"
        className={styles.arrow}
      />
    </button>
  );
}

export default PayMethodButton;
