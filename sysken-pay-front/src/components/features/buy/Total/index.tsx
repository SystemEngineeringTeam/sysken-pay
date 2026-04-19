import { useNavigate } from "react-router-dom";
import { useTotalPrice } from "../../../../hooks/useTotalPrice";
import { useCartStore } from "../../../../store/useCartStore";
import { PriceLabel } from "../../../ui/PriceLabel";
import Button from "../../../ui/Button";
import styles from "./Total.module.scss";

interface TotalProps {
  title: string;
  label: string;
  showButton?: boolean;
}

export default function Total({ title, label, showButton = false }: TotalProps) {
  const navigate = useNavigate();
  const totalPrice = useTotalPrice();
  const clearCart = useCartStore((state) => state.clearCart);

  const handleCashComplete = () => {
    clearCart();
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
