import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { CompletionModal } from "../../../components/ui/CompletionModal";
import Header from "../../../components/layouts/Header";
import ArrowButton from "../../../components/ui/ArrowButton";
import { useUserStore } from "../../../store/useUserStore";
import { UserRepositoryImpl } from "../../../adapter/repository/UserRepositoryImpl";
import styles from "./name.module.scss";

export default function UserUpdateNamePage(): JSX.Element {
  const navigate = useNavigate();
  const scannedUser = useUserStore((state) => state.scannedUser);
  const [newUserId, setNewUserId] = useState(scannedUser?.user_id ?? "");
  const [name, setName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    if (errorMessage) setErrorMessage("");
  }

  const handleUpdate = async () => {
    if (!newUserId.trim()) {
      setErrorMessage("IDを入力してください");
      return;
    }
    if (!name.trim()) {
      setErrorMessage("名前を入力してください");
      return;
    }
    if (!scannedUser?.user_id) {
      setErrorMessage("ユーザー情報が見つかりません。再度バーコードをスキャンしてください");
      return;
    }
    try {
      await UserRepositoryImpl.updateUser(scannedUser.user_id, { user_name: name }); // TODO user_id: newUserId 追加
      setErrorMessage("");
      setShowModal(true);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "更新に失敗しました");
    }
  }

  return (
    <div className={styles.container}>
      <Header title="ユーザー更新" />
      <div className={styles.content}>
        <div className={styles.field}>
          <Input
            label="新しいID"
            placeholder="20k24000"
            value={newUserId}
            onChange={handleChange(setNewUserId)}
          />
          <Input
            label="新しい名前"
            placeholder="k24000_シス研太郎"
            value={name}
            onChange={handleChange(setName)}
          />
          {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        </div>
      </div>
      <div className={styles.buttonWrapper}>
        <Button size="md" onClick={handleUpdate}>
          更新
        </Button>
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/user-update")}>
        戻る
      </ArrowButton>
      {showModal && (
        <CompletionModal
          mode="userUpdate"
          name={name}
          onClose={() => navigate("/admin/menu")}
        />
      )}
    </div>
  );
}
