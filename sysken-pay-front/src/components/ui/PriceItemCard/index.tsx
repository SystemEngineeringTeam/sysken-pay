import styles from "./PriceItemCard.module.scss";

type Props = {
  title: string;
  price: number;
  onDelete?: () => void;
  /** ボタンの文言。省略すると「削除 ✕」 */
  deleteLabel?: string;
};

export const PriceItemCard = ({ title, price, onDelete, deleteLabel }: Props) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.content}>
          <span className={styles.title}>{title}</span>
          <span className={styles.priceContainer}>
            <span className={styles.currency}>¥</span>
            <span className={styles.price}>{price.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* 削除ボタン */}
      {onDelete && (
        <button
          className={styles.deleteButton}
          onClick={onDelete}
          type="button"
        >
          {deleteLabel ?? (
            <>
              削除<span className={styles.closeIcon}>✕</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
