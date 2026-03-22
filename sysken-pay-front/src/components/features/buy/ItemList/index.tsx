import type { Item } from "../../../../types/domain/Item";
import { PriceItemCard } from "../../../ui/PriceItemCard";
import styles from "./ItemList.module.scss";

type Props = {
  Items: Item[];
  onDelete: (id: string) => void;
};

export const ItemList = ({ Items, onDelete }: Props) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>ご購入内容を確認してください</h2>
      <div className={styles.list}>
        {Items.map((Item) => (
          <PriceItemCard
            key={Item.id}
            title={Item.name}
            price={Item.price}
            onDelete={() => onDelete(Item.id)}
          />
        ))}
      </div>
    </div>
  );
};
