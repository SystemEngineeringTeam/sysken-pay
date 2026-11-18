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
import { isValidStudentId, toUserUpdateErrorMessage } from "../../../services/userUpdate";
import styles from "./name.module.scss";

export default function UserUpdateNamePage(): JSX.Element {
  const navigate = useNavigate();
  const scannedUser = useUserStore((state) => state.scannedUser);
  const setScannedUser = useUserStore((state) => state.setScannedUser);
  // 今の学籍番号と名前を最初から入れておく（変えるところだけ直せばよい）
  const [newUserId, setNewUserId] = useState(scannedUser?.user_id ?? "");
  const [name, setName] = useState(scannedUser?.user_name ?? "");
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    if (errorMessage) setErrorMessage("");
  }

  const handleUpdate = async () => {
    const nextId = newUserId.trim();
    if (!nextId) {
      setErrorMessage("学籍番号を入力してください");
      return;
    }
    if (!isValidStudentId(nextId)) {
      setErrorMessage("学籍番号は「24K01234」の形で入れてください");
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
    const idChanged = nextId !== scannedUser.user_id;
    try {
      const data = await UserRepositoryImpl.updateUser(scannedUser.user_id, {
        user_name: name,
        // 学籍番号は変えるときだけ送る
        ...(idChanged ? { user_id: nextId } : {}),
      });
      setScannedUser({ user_id: data?.user_id ?? nextId, user_name: data?.user_name ?? name });
      setErrorMessage("");
      setShowModal(true);
    } catch (e) {
      setErrorMessage(toUserUpdateErrorMessage(e));
    }
  }

  return (
    <div className={styles.container}>
      <Header title="ユーザー更新" />
      <div className={styles.content}>
        <div className={styles.field}>
          <Input
            label="学籍番号"
            placeholder="24K01234"
            value={newUserId}
            onChange={handleChange(setNewUserId)}
          />
          <Input
            label="名前"
            placeholder="k24000_yamadataro"
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
      <ArrowButton variant="prev" onClick={() => navigate(-1)}>
        戻る
      </ArrowButton>
      {showModal && (
        <CompletionModal
          mode="userUpdate"
          name={name}
          onClose={() => navigate("/admin/user-menu")}
        />
      )}
    </div>
  );
}
