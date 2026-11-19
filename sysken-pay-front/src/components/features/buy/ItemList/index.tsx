import type { CartItem } from "../../../../store/useCartStore";
import { PriceItemCard } from "../../../ui/PriceItemCard";
import styles from "./ItemList.module.scss";

type Props = {
  Items: CartItem[];
  onDelete: (itemId: number) => void;
  /** 上に出す見出し */
  title?: string;
};

export const ItemList = ({ Items, onDelete, title = "ご購入内容を確認してください" }: Props) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
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
