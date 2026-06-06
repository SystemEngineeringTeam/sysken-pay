import type { JSX } from "react";
import { useState } from "react";
import { BarcodeReader } from "../../../components/ui/BarcodeReader";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import { useUserStore } from "../../../store/useUserStore";
import { UserRepositoryImpl } from "../../../adapter/repository/UserRepositoryImpl";
import { ApiError } from "../../../adapter/api/ApiError";
import ArrowButton from "../../../components/ui/ArrowButton";
import styles from "./index.module.scss";

export default function UserRegisterPage(): JSX.Element {
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
      await UserRepositoryImpl.getUser(barcode);
      setError("このユーザーはすでに登録済みです");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setScannedUser({ user_id: barcode });
        navigate("/admin/user-register/name");
        return;
      }
      if (err instanceof ApiError && err.status === 400) {
        setError("バーコードの形式が正しくありません");
        return;
      }
      setError("ユーザー確認に失敗しました");
    }
  };

  return (
    <div className={styles.container}>
      <Header title="ユーザー登録" />
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
