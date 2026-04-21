import type { JSX } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarcodeReader } from "../../../components/ui/BarcodeReader";
import { useUserStore } from "../../../store/useUserStore";
import { useBalanceStore } from "../../../store/useBalanceStore";
import { UserRepositoryImpl } from "../../../adapter/repository/UserRepositoryImpl";
import Header from "../../../components/layouts/Header";
import Total from "../../../components/features/buy/Total";
import ArrowButton from "../../../components/ui/ArrowButton";
import { useState } from "react";
import styles from "./index.module.scss";

export default function PaymentStartPage(): JSX.Element {
  const { paymentMethod } = useParams();
  const navigate = useNavigate();
  const setScannedUser = useUserStore((state) => state.setScannedUser);
  const setBalance = useBalanceStore((state) => state.setBalance);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (barcode: string) => {
    try {
      const data = await UserRepositoryImpl.getBalance(barcode);
      if (!data?.user_id) throw new Error("ユーザーが見つかりませんでした");
      setScannedUser({ user_id: data.user_id });
      setBalance(data);
      navigate(`/buy/${paymentMethod}/confirm`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ユーザー情報の取得に失敗しました");
    }
  }

  return (
    <div className={styles.container}>
      {paymentMethod === "cash" ? (
        <>
          <Header title="現金支払い" right="toTop" />
          <Total title="お金を箱に入れてください" label="合計" showButton />
        </>
      ) : (
        <>
          <Header title="シス研Pay支払い" right="toTop" />
          <BarcodeReader
            mode="member"
            onScan={handleScan}
            placeholder="学生証のバーコードをかざしてください"
          />
          {error && <p>{error}</p>}
        </>
      )}
      <ArrowButton variant="prev" onClick={() => navigate("/buy/confirm")}>
        戻る
      </ArrowButton>
    </div>
  );
}
