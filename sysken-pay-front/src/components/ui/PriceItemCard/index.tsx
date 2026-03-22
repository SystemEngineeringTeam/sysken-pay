import styles from "./PriceItemCard.module.scss";

type Props = {
  title: string;
  price: number;
  onDelete?: () => void;
};

export const PriceItemCard = ({ title, price, onDelete }: Props) => {
  return (
    <div className={styles.wrapper}>
      {/* 白いカード部分 */}
      <div className={styles.card}>
        <div className={styles.content}>
          <span className={styles.title}>{title}</span>
          <span className={styles.priceContainer}>
            <span className={styles.currency}>¥</span>
            <span className={styles.price}>{price.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* 削除ボタン（onDeleteが渡された時だけ表示） */}
      {onDelete && (
        <button
          className={styles.deleteButton}
          onClick={onDelete}
          type="button"
        >
          削除<span className={styles.closeIcon}>✕</span>
        </button>
      )}
    </div>
  );
};
