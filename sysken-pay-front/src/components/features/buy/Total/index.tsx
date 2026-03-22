import { useNavigate } from "react-router-dom";
import { useTotalPrice } from "../../../../hooks/useTotalPrice";
import { PriceLabel } from "../../../ui/PriceLabel";
import Button from "../../../ui/Button";
import styles from "./Total.module.scss";

interface TotalProps {
  title: string;
  label: string;
  showButton?: boolean; // 完了ボタンの有無（デフォルト: false）
}

export default function Total({
  title,
  label,
  showButton = false,
}: TotalProps) {
  const navigate = useNavigate();
  const totalPrice = useTotalPrice();

  const handleCashComplete = () => {
    // TODO: 決済API呼び出し
    navigate("/buy/complete");
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.priceWrapper}>
        <PriceLabel label={label} price={totalPrice} />
      </div>
      {showButton && (
        <div className={styles.buttonWrapper}>
          <Button onClick={handleCashComplete}>完了</Button>
        </div>
      )}
    </div>
  );
}
