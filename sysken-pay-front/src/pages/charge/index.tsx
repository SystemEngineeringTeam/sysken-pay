import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import Button from "../../components/ui/Button/index";
import { Input } from "../../components/ui/Input";
import { BarcodeReader } from "../../components/ui/BarcodeReader";
import ArrowButton from "../../components/ui/ArrowButton";
import { useUserScan } from "../../hooks/useBarcodeReader";
import styles from "./index.module.scss";

export default function ChargePage(): JSX.Element {
  const navigate = useNavigate();
  const { onScan, ErrorMessage } = useUserScan();
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = () => {
    if (password !== import.meta.env.VITE_ADMIN_PASSWORD) {
      setErrorMessage("パスワードが違います");
      return;
    }
    setErrorMessage("");
    setAuthenticated(true);
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errorMessage) setErrorMessage("");
  }

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <Header title="チャージ" />
        <div className={styles.content}>
          <div className={styles.form}>
            <h1 className={styles.title}>パスワードを入力してください</h1>
            <div className={styles.inputWrapper}>
              <Input type="password" value={password} onChange={handlePasswordChange} />
              {errorMessage && <p className={styles.error}>{errorMessage}</p>}
            </div>
          </div>
        </div>
        <div className={styles.buttonWrapper}>
          <Button size="md" onClick={handleSubmit}>
            決定
          </Button>
        </div>
        <ArrowButton variant="prev" onClick={() => navigate("/")}>
          戻る
        </ArrowButton>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header title="チャージ" />
      <div className={styles.content}>
        <BarcodeReader
          mode="member"
          onScan={onScan}
          placeholder="学生証のバーコードをかざしてください"
        />
        <ErrorMessage />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/")}>
        戻る
      </ArrowButton>
    </div>
  );
}
