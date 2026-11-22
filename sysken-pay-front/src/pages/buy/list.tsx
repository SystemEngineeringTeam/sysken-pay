import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import { ItemList } from "../../components/features/buy/ItemList";
import { useCartStore } from "../../store/useCartStore";
import Header from "../../components/layouts/Header";
import ArrowButton from "../../components/ui/ArrowButton";
import { PriceLabel } from "../../components/ui/PriceLabel";
import { HiddenBarcodeInput } from "../../components/ui/HiddenBarcodeInput";
import { useCartScan } from "../../hooks/useBarcodeReader";
import { useTotalPrice } from "../../hooks/useTotalPrice";
import styles from "./list.module.scss";

/**
 * カート。この画面でリーダーに
 * - 商品をかざす → カートに足す
 * - シス研Payバーコードをかざす → すぐに買って完了画面へ（ボタンは押さない）
 * 現金の人だけ「現金で払う」を押す。
 */
export default function BuyListPage(): JSX.Element {
  const navigate = useNavigate();
  const { cartItems: items, removeItem, clearCart } = useCartStore();
  const totalPrice = useTotalPrice();
  const itemCount = items.reduce((sum, { quantity }) => sum + quantity, 0);
  const { onScan, ErrorMessage } = useCartScan();

  return (
    <div className={styles.container}>
      <Header title="商品購入" confirmHome />
      <HiddenBarcodeInput onScan={onScan} />
      <div className={styles.content}>
        <ItemList
          Items={items}
          onDelete={removeItem}
          title="シス研Payバーコードをかざして購入"
          emphasis
          icon="/icons/Barcord.svg"
        />
        {/* 商品が1個のあいだだけ、続けてかざせることを案内する（2個になったら消す） */}
        {itemCount < 2 && <p className={styles.hint}>商品を続けてかざせます</p>}
        <ErrorMessage />
        <div className={styles.footer}>
          <PriceLabel label="合計" price={totalPrice} />
        </div>
      </div>
      <ArrowButton variant="prev" onClick={() => { clearCart(); navigate("/buy"); }}>
        戻る
      </ArrowButton>
      <ArrowButton variant="next" onClick={() => navigate("/buy/cash")}>
        現金で払う
      </ArrowButton>
    </div>
  );
}
