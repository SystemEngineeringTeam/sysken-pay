import { useState, type JSX } from "react";
import styles from "./BarcodeReader.module.scss";
import { useBarcodeReader } from "../../../hooks/useBarcodeReader";
import { Input } from "../Input";

const ICONS_BASE = "https://raw.githubusercontent.com/sana-sagegami/sysken-pay/main/public/icons";

interface BarcodeReaderProps {
  mode: "product" | "member";
  onScan: (barcode: string) => void;
  placeholder?: string;
}

export function BarcodeReader({ mode, onScan, placeholder }: BarcodeReaderProps): JSX.Element {
  const { handleBarcodeScan } = useBarcodeReader(mode);

  const [inputValue, setInputValue] = useState("");

  function handleInput(value: string) {
    setInputValue(value);
    if (value) {
      handleBarcodeScan(value);
      onScan(value);
      setInputValue("");
    }
  }

  const defaultPlaceholder =
    mode === "product"
      ? "商品のバーコードをかざしてください"
      : "学生証のナンバーをかざしてください";

  const modeIcon =
    mode === "product" ? `${ICONS_BASE}/Barcode.svg` : `${ICONS_BASE}/MemberCard.svg`;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.placeholder}>{placeholder || defaultPlaceholder}</p>
        <div className={styles.iconWrapper}>
          <img src={`${ICONS_BASE}/BarcodeReader.svg`} alt="バーコードリーダー" />
          <img src={modeIcon} alt={mode === "product" ? "商品バーコード" : "学生証"} />
        </div>
      </div>
      <Input
        autoFocus
        className={styles.hiddenInput}
        onChange={handleInput}
        value={inputValue}
        type="text"
      />
    </div>
  );
}
