import { useNavigate } from "react-router-dom";
import styles from "./HomeButtons.module.scss";

interface HomeButtonsProps {
  onBuy?: () => void;
  onCharge?: () => void;
}

export function HomeButtons({ onBuy, onCharge }: HomeButtonsProps) {
  const navigate = useNavigate();

  return (
    <>
      <button
        className={styles.checkoutButton}
        onClick={onBuy ?? (() => navigate("/buy"))}
      >
        お会計を始める
      </button>
      <button
        className={styles.chargeButton}
        onClick={onCharge ?? (() => navigate("/charge"))}
      >
        チャージ
      </button>
    </>
  );
}
