import type { JSX } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import Button from "../../../components/ui/Button";
import ArrowButton from "../../../components/ui/ArrowButton";
import SyskenPayConfirm from "../../../components/features/buy/SyskenPayConfirm";
import { useTotalPrice } from "../../../hooks/useTotalPrice";
import { useBalanceStore } from "../../../store/useBalanceStore";
import { useUserStore } from "../../../store/useUserStore";
import { useCartStore } from "../../../store/useCartStore";
import { PurchaseRepositoryImpl } from "../../../adapter/repository/PurchaseRepositoryImpl";
import styles from "./confirm.module.scss";

export default function SyskenPayConfirmPage(): JSX.Element {
  const navigate = useNavigate();
  const { paymentMethod } = useParams();
  const [errorMessage, setErrorMessage] = useState("");

  const balance = useBalanceStore((state) => state.balance?.balance ?? 0);
  const userId = useUserStore((state) => state.scannedUser?.user_id ?? "");
  const { cartItems, clearCart } = useCartStore();
  const setBalance = useBalanceStore((state) => state.setBalance);
  const totalPrice = useTotalPrice();

  const handlePurchase = async () => {
    if (balance < totalPrice) {
      setErrorMessage(`残高が不足しています（不足額: ￥${totalPrice - balance}）`);
      return;
    }
    try {
      const items = cartItems.map(({ item, quantity }) => ({
        item_id: item.item_id ?? 0,
        quantity,
      }));
      const data = await PurchaseRepositoryImpl.createPurchase(userId, { items });
      if (data.balance !== undefined && data.user_id) {
        setBalance({ user_id: data.user_id, balance: data.balance });
      }
      clearCart();
      setErrorMessage("");
      navigate("/buy/complete");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "購入に失敗しました");
    }
  }

  return (
    <div className={styles.container}>
      <Header title="購入確定" right="toTop" />
      <div className={styles.content}>
        <SyskenPayConfirm balance={balance} />
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      </div>
      <div className={styles.buttonWrapper}>
        <Button onClick={handlePurchase}>購入</Button>
      </div>
      <ArrowButton variant="prev" onClick={() => navigate(`/buy/${paymentMethod}`)}>
        戻る
      </ArrowButton>
    </div>
  );
}
