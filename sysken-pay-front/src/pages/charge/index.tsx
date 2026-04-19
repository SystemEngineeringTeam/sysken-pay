import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import { BarcodeReader } from "../../components/ui/BarcodeReader";
import ArrowButton from "../../components/ui/ArrowButton";
import { useBalanceStore } from "../../store/useBalanceStore";
import { useUserStore } from "../../store/useUserStore";
import { UserRepositoryImpl } from "../../adapter/repository/UserRepositoryImpl";
import styles from "./index.module.scss";

export default function ChargePage(): JSX.Element {
  const navigate = useNavigate();
  const setBalance = useBalanceStore((state) => state.setBalance);
  const setScannedUser = useUserStore((state) => state.setScannedUser);
  const [error, setError] = useState<string | null>(null);

  async function handleScan(barcode: string) {
    try {
      const data = await UserRepositoryImpl.getBalance(barcode);
      if (!data?.user_id) throw new Error("ユーザーが見つかりませんでした");
      setBalance(data);
      setScannedUser({ user_id: data.user_id });
      navigate("/charge/select");
    } catch (e) {
      setError(e instanceof Error ? e.message : "残高の取得に失敗しました");
    }
  }

  return (
    <div className={styles.container}>
      <Header title="チャージ" />
      <div className={styles.content}>
        <BarcodeReader
          mode="member"
          onScan={handleScan}
          placeholder="学生証のバーコードをかざしてください"
        />
        {error && <p>{error}</p>}
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/")}>
        戻る
      </ArrowButton>
    </div>
  );
}
