import type { CartItem } from "../../../../store/useCartStore";
import { PriceItemCard } from "../../../ui/PriceItemCard";
import styles from "./ItemList.module.scss";

type Props = {
  Items: CartItem[];
  onDelete: (itemId: number) => void;
  /** 上に出す見出し */
  title?: string;
  /** 見出しを青い帯にして目立たせる（次にやることを案内したいとき） */
  emphasis?: boolean;
  /** 見出しの隣に置く小さな画像（public 以下のパス） */
  icon?: string;
};

export const ItemList = ({ Items, onDelete, title = "ご購入内容を確認してください", emphasis = false, icon }: Props) => {
  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <h2 className={`${styles.title} ${emphasis ? styles.emphasis : ""}`}>{title}</h2>
        {icon && <img src={icon} alt="" aria-hidden="true" className={styles.icon} />}
      </div>
      <div className={styles.list}>
        {Items.map(({ item, quantity }) => (
          <PriceItemCard
            key={item.item_id}
            title={`${item.item_name ?? ""} × ${quantity}`}
            price={(item.price ?? 0) * quantity}
            onDelete={() => onDelete(item.item_id ?? 0)}
          />
        ))}
      </div>
    </div>
  );
};
