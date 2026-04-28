import type { JSX } from "react";
import { useState } from "react";
import { BarcodeReader } from "../../../components/ui/BarcodeReader";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import { useUserStore } from "../../../store/useUserStore";
import { UserRepositoryImpl } from "../../../adapter/repository/UserRepositoryImpl";
import ArrowButton from "../../../components/ui/ArrowButton";
import styles from "./index.module.scss";

export default function UserUpdatePage(): JSX.Element {
  const navigate = useNavigate();
  const setScannedUser = useUserStore((state) => state.setScannedUser);
  const clearScannedUser = useUserStore((state) => state.clearScannedUser);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (barcode: string) => {
    if (!barcode) {
      setError("バーコードを読み取れませんでした");
      return;
    }
    setError(null);
    clearScannedUser();
    try {
      await UserRepositoryImpl.getBalance(barcode);
      setScannedUser({ user_id: barcode });
      navigate("/admin/user-update/name");
    } catch {
      setError("このユーザーは登録されていません");
    }
  }

  return (
    <div className={styles.container}>
      <Header title="ユーザー更新" />
      <div className={styles.content}>
        <BarcodeReader
          mode="member"
          onScan={handleScan}
          placeholder="学生証のバーコードをかざしてください"
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/menu")}>
        戻る
      </ArrowButton>
    </div>
  );
}
