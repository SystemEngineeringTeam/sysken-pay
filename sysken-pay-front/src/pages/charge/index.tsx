import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import Button from "../../components/ui/Button/index";
import { Input } from "../../components/ui/Input";
import { BarcodeReader } from "../../components/ui/BarcodeReader";
import ArrowButton from "../../components/ui/ArrowButton";
import { useBalanceStore } from "../../store/useBalanceStore";
import { useUserStore } from "../../store/useUserStore";
import { UserRepositoryImpl } from "../../adapter/repository/UserRepositoryImpl";
import styles from "./index.module.scss";

export default function ChargePage(): JSX.Element {
  const navigate = useNavigate();
  const setBalance = useBalanceStore((state) => state.setBalance);
  const setScannedUser = useUserStore((state) => state.setScannedUser);
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);

  function handleSubmit() {
    if (password !== import.meta.env.VITE_ADMIN_PASSWORD) {
      setErrorMessage("パスワードが違います");
      return;
    }
    setErrorMessage("");
    setAuthenticated(true);
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (errorMessage) setErrorMessage("");
  }

  async function handleScan(barcode: string) {
    try {
      const data = await UserRepositoryImpl.getBalance(barcode);
      if (!data?.user_id) throw new Error("ユーザーが見つかりませんでした");
      setBalance(data);
      setScannedUser({ user_id: data.user_id });
      navigate("/charge/select");
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "残高の取得に失敗しました");
    }
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
          onScan={handleScan}
          placeholder="学生証のバーコードをかざしてください"
        />
        {scanError && <p>{scanError}</p>}
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/")}>
        戻る
      </ArrowButton>
    </div>
  );
}
