import type { JSX } from "react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import Button from "../../components/ui/Button/index";
import { Input } from "../../components/ui/Input";
import ArrowButton from "../../components/ui/ArrowButton";
import { useAdminLogin } from "../../hooks/useAdminLogin";
import styles from "./index.module.scss";

export default function Admin(): JSX.Element {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const { login, isLoading, error: errorMessage, clearError } = useAdminLogin();

  const handleHome = () => {
    navigate("/");
  }

  const formRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async () => {
    if (isLoading) return;
    if (await login(password)) {
      navigate("/admin/menu");
      return;
    }
    // 失敗したら、入力欄を空にして、次のバーコードをすぐ読めるようにフォーカスを戻す
    // （空にしないと、次に読んだ文字が前の文字の後ろにつながってしまう）
    setPassword("");
    window.setTimeout(() => formRef.current?.querySelector("input")?.focus(), 0);
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errorMessage) clearError();
  }

  return (
    <div className={styles.container}>
      <Header title="管理者" />
      <div className={styles.content}>
        <div className={styles.form}>
          <h1 className={styles.title}>バーコードか、パスワードで進めます</h1>
          <div className={styles.scanHint}>
            <img src="/icons/BarcordReader.svg" alt="" className={styles.scanIcon} />
            <p className={styles.scanText}>管理者のシス研Payバーコードをかざす</p>
          </div>
          <p className={styles.or}>または パスワードを入力</p>
          <div className={styles.inputWrapper} ref={formRef}>
            <Input
              type="password"
              autoFocus
              value={password}
              onChange={handlePasswordChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmit();
              }}
            />
            {errorMessage && <p className={styles.error}>{errorMessage}</p>}
          </div>
        </div>
      </div>
      <div className={styles.buttonWrapper}>
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
