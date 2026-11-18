import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import Header from "../../../components/layouts/Header";
import ArrowButton from "../../../components/ui/ArrowButton";
import { useUserStore } from "../../../store/useUserStore";
import { UserRepositoryImpl } from "../../../adapter/repository/UserRepositoryImpl";
import { ApiError } from "../../../adapter/api/ApiError";
import type { PhoneRegisterState } from "../../../services/phoneRegisterState";
import styles from "./name.module.scss";

export default function UserRegisterNamePage(): JSX.Element {
  const navigate = useNavigate();
  const scannedUser = useUserStore((state) => state.scannedUser);
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    if (errorMessage) setErrorMessage("");
  }

  const handleRegister = async () => {
    if (!name.trim()) {
      setErrorMessage("名前を入力してください");
      return;
    }
    if (!scannedUser?.user_id) {
      setErrorMessage("ユーザー情報が見つかりません。再度バーコードをスキャンしてください");
      return;
    }
    try {
      await UserRepositoryImpl.registerUser({
        user_id: scannedUser.user_id,
        user_name: name,
      });
      setErrorMessage("");
      // 登録できたら、そのままスマホ登録（支払い用バーコードの QR）へ進む
      const state: PhoneRegisterState = { userId: scannedUser.user_id, justRegistered: true };
      navigate("/admin/phone-register", { state });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErrorMessage("このユーザーIDはすでに登録されています");
        return;
      }
      setErrorMessage(e instanceof Error ? e.message : "登録に失敗しました");
    }
  }

  return (
    <div className={styles.container}>
      <Header title="ユーザー登録" />
      <div className={styles.content}>
        <div className={styles.field}>
          <Input
            label="名前"
            placeholder="k24000_yamadataro"
            value={name}
            onChange={handleNameChange}
          />
          {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        </div>
      </div>
      <div className={styles.buttonWrapper}>
        <Button size="md" onClick={handleRegister}>
          登録
        </Button>
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/user-register")}>
        戻る
      </ArrowButton>
    </div>
  );
}
