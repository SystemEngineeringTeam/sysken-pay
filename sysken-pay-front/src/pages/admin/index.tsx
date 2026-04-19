import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import Button from "../../components/ui/Button/index";
import { Input } from "../../components/ui/Input";
import ArrowButton from "../../components/ui/ArrowButton";
import styles from "./index.module.scss";

export default function Admin(): JSX.Element {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleHome() {
    navigate("/");
  }

  function handleSubmit() {
    if (!password.trim()) {
      setErrorMessage("パスワードを入力してください");
      return;
    }
    setErrorMessage("");
    navigate("/admin/menu");
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (errorMessage) setErrorMessage("");
  }

  return (
    <div className={styles.container}>
      <Header title="管理者" />
      <div className={styles.content}>
        <div className={styles.form}>
          <h1 className={styles.title}>パスワードを入力してください</h1>
          <div className={styles.inputWrapper}>
            <Input type="password" value={password} onChange={handlePasswordChange} />
            {errorMessage && <p className={styles.error}>{errorMessage}</p>}
          </div>
        </div>
        <Button size="md" onClick={handleSubmit}>
          決定
        </Button>
      </div>
      <ArrowButton variant="prev" onClick={handleHome}>
        戻る
      </ArrowButton>
    </div>
  );
}
