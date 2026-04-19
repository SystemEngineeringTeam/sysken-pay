import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import { BarcodeReader } from "../../components/ui/BarcodeReader";
import ArrowButton from "../../components/ui/ArrowButton";
import { useBalanceStore } from "../../store/useBalanceStore";
import styles from "./index.module.scss";

export default function ChargePage(): JSX.Element {
  const navigate = useNavigate();
  const setBalance = useBalanceStore((state) => state.setBalance);

  function handleScan(barcode: string) {
    // TODO: APIから残高を参照
    setBalance({ userId: barcode, balance: 550 });
    navigate("/charge/select");
  }

  function handleHome() {
    navigate("/");
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
      </div>
      <ArrowButton variant="prev" onClick={handleHome}>
        戻る
      </ArrowButton>
    </div>
  );
}
