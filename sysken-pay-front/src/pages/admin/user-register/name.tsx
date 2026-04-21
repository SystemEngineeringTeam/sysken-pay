import type { JSX } from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { CompletionModal } from "../../../components/ui/CompletionModal";
import Header from "../../../components/layouts/Header";
import ArrowButton from "../../../components/ui/ArrowButton";
import { useUserStore } from "../../../store/useUserStore";
import { UserRepositoryImpl } from "../../../adapter/repository/UserRepositoryImpl";
import styles from "./name.module.scss";

export default function UserRegisterNamePage(): JSX.Element {
  const navigate = useNavigate();
  const scannedUser = useUserStore((state) => state.scannedUser);
  const [name, setName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    if (!scannedUser?.user_id) return;
    UserRepositoryImpl.getBalance(scannedUser.user_id)
      .then(() => setAlreadyRegistered(true))
      .catch(() => setAlreadyRegistered(false));
  }, [scannedUser?.user_id]);

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
      setShowModal(true);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "登録に失敗しました");
    }
  }

  return (
    <div className={styles.container}>
      <Header title="ユーザー登録" />
      <div className={styles.content}>
        {alreadyRegistered ? (
          <div className={styles.alreadyRegistered}>
            <span>このユーザーは登録済みです</span>
          </div>
        ) : (
          <div className={styles.field}>
            <Input
              label="名前"
              placeholder="k24000_シス研太郎"
              value={name}
              onChange={handleNameChange}
            />
            {errorMessage && <p className={styles.error}>{errorMessage}</p>}
          </div>
        )}
      </div>
      <div className={styles.buttonWrapper}>
        {!alreadyRegistered && (
          <Button size="md" onClick={handleRegister}>
            登録
          </Button>
        )}
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/user-register")}>
        戻る
      </ArrowButton>
      {showModal && (
        <CompletionModal
          mode="userRegister"
          name={name}
          onClose={() => navigate("/admin/menu")}
        />
      )}
    </div>
  );
}
