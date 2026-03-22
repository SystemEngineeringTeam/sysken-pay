import { useNavigate } from "react-router-dom";
import styles from "./PayMethodButton.module.scss";

// 2個セットで使うラッパーコンポーネント
export function PayMethodButtonGroup() {
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


function PayMethodButton({ type }: PayMethodButtonProps) {
  const navigate = useNavigate();
  const isCash = type === "cash";

  const handleClick = () => {
    navigate(isCash ? "/buy/cash" : "/buy/syspay");
  };

  return (
    <button
      className={isCash ? styles.cashButton : styles.syspayButton}
      onClick={handleClick}
    >
      <div className={styles.content}>
        <img
          src={isCash ? "/icons/Cash.svg" : "/icons/BlueBarcode.svg"}
          alt={isCash ? "Cash" : "SysPay"}
          className={isCash ? styles.cashIcon : styles.syspayIcon}
        />
        {isCash ? "現金" : "シス研Pay"}
      </div>
      <img
        src="/icons/LeftArrow.svg"
        alt="arrow"
        className={styles.arrow}
      />
    </button>
  );
}


export default PayMethodButton;
