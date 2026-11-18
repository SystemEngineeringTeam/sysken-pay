import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import ArrowButton from "../../components/ui/ArrowButton";
import { SelectButtonGroup } from "../../components/features/charge/SelectButton";
import { PriceLabel } from "../../components/ui/PriceLabel";
import { Input } from "../../components/ui/Input";
import { useBalanceStore } from "../../store/useBalanceStore";
import { useChargeStore } from "../../store/useChargeStore";
import { chargeAmountsLabel, isChargeAmount } from "../../services/chargeAmounts";
import { useUserStore } from "../../store/useUserStore";
import styles from "./select.module.scss";

export default function ChargeSelectPage(): JSX.Element {
  const navigate = useNavigate();
  const balance = useBalanceStore((state) => state.balance?.balance ?? 0);
  const userName = useUserStore((state) => state.scannedUser?.user_name);
  const saveChargeAmount = useChargeStore((state) => state.setChargeAmount);
  const [chargeAmount, setChargeAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleAmountChange = (value: string) => {
    setChargeAmount(value.replace(/[^\d]/g, ""));
    if (errorMessage) setErrorMessage("");
  }

  const handleNext = () => {
    const normalizedChargeAmount = Number(chargeAmount.replace(/[^\d]/g, ""));
    if (!isChargeAmount(normalizedChargeAmount)) {
      setErrorMessage(`${chargeAmountsLabel}から選んでください`);
      return;
    }
    setErrorMessage("");
    saveChargeAmount(normalizedChargeAmount);
    navigate("/charge/insert");
  }

  return (
    <div className={styles.container}>
      <Header title="チャージ金額" confirmHome />
      <div className={styles.content}>
        <div className={styles.inner}>
          {userName && <p className={styles.userName}>{userName} さん</p>}
          <PriceLabel label="残高" price={balance} />
          <div className={styles.title}>チャージ金額を選択してください</div>
          <div className={styles.inputWrapper}>
            <Input
              value={chargeAmount === "" ? "" : `￥${chargeAmount}`}
              onChange={handleAmountChange}
            />
            {errorMessage && <p className={styles.error}>{errorMessage}</p>}
          </div>
        </div>
        <SelectButtonGroup selectedAmount={chargeAmount} onSelectAmount={handleAmountChange} />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/charge")}>
        戻る
      </ArrowButton>
      <ArrowButton variant="next" onClick={handleNext}>
        次へ
      </ArrowButton>
    </div>
  );
}
