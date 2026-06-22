import { useNavigate } from "react-router-dom";
import styles from "./ChargeButton.module.scss";

interface ChargeButtonProps {
  onCharge?: () => void;
}

export function ChargeButton({ onCharge }: ChargeButtonProps) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (onCharge) {
      onCharge();
    } else {
      navigate("/charge");
    }
  };

  return (
    <button
      type="button"
      className={styles.chargeButton}
      onClick={handleClick}
    >
      チャージ
    </button>
  );
}
