import type { JSX } from "react";
import { useState } from "react";
import { BarcodeReader } from "../../../components/ui/BarcodeReader";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import { useUserStore } from "../../../store/useUserStore";
import ArrowButton from "../../../components/ui/ArrowButton";
import styles from "./index.module.scss";

export default function UserRegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const setScannedUser = useUserStore((state) => state.setScannedUser);
  const [error, setError] = useState<string | null>(null);

  function handleScan(barcode: string) {
    if (!barcode) {
      setError("バーコードを読み取れませんでした");
      return;
    }
    setScannedUser({ user_id: barcode });
    navigate("/admin/user-register/name");
  }

  return (
    <div className={styles.container}>
      <Header title="ユーザー登録" />
      <div className={styles.content}>
        <BarcodeReader
          mode="member"
          onScan={handleScan}
          placeholder="学生証のバーコードをかざしてください"
        />
        {error && <p>{error}</p>}
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin")}>
        戻る
      </ArrowButton>
    </div>
  );
}
