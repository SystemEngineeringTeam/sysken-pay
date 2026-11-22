import type { JSX } from "react";
import { useState } from "react";
import { BarcodeReader } from "../../../components/ui/BarcodeReader";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import { useUserStore } from "../../../store/useUserStore";
import { UserRepositoryImpl } from "../../../adapter/repository/UserRepositoryImpl";
import { ApiError } from "../../../adapter/api/ApiError";
import type { PhoneRegisterState } from "../../../services/phoneRegisterState";
import ArrowButton from "../../../components/ui/ArrowButton";
import { ADMIN_USER_STOPPED_MESSAGE } from "../../../services/userScanErrorMessage";
import styles from "./index.module.scss";

export default function UserRegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const clearScannedUser = useUserStore((state) => state.clearScannedUser);
  const [error, setError] = useState<string | null>(null);

  // 名前は入力しない。学籍番号をそのまま名前にして登録し、スマホ登録（支払い用バーコードの QR）へ進む
  const register = async (userId: string) => {
    try {
      await UserRepositoryImpl.registerUser({ user_id: userId, user_name: userId });
      const state: PhoneRegisterState = { userId, justRegistered: true };
      navigate("/admin/phone-register", { state });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError("このユーザーはすでに登録済みです");
        return;
      }
      if (e instanceof ApiError && e.status === 400) {
        setError("バーコードの形式が正しくありません");
        return;
      }
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

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
        await register(barcode);
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError(ADMIN_USER_STOPPED_MESSAGE);
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
          error={error}
        />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/menu")}>
        戻る
      </ArrowButton>
    </div>
  );
}
