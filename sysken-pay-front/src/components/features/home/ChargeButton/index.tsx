import { useNavigate } from "react-router-dom";
import styles from "./ChargeButton.module.scss";

interface ChargeButtonProps {
  onCharge?: () => void;
}

export function ChargeButton({ onCharge }: ChargeButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={styles.chargeButton}
      onClick={onCharge ?? (() => navigate("/charge"))}
    >
      チャージ
    </button>
  );
}
