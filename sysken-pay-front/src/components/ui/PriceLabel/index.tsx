import styles from "./PriceLabel.module.scss";

type Props = {
  label: string;
  price: number;
  className?: string;
};

export const PriceLabel = ({ label, price, className }: Props) => {
  return (
    <div className={`${styles.container} ${className ?? ""}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.priceContainer}>
        <span className={styles.currency}>¥</span>
        <span className={styles.price}>{price.toLocaleString()}</span>
      </div>
    </div>
  );
};
