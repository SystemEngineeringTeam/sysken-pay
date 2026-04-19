import { useState, type JSX, type KeyboardEvent } from "react";
import styles from "./BarcodeReader.module.scss";
import { Input } from "../Input";

interface BarcodeReaderProps {
  mode: "product" | "member";
  onScan: (barcode: string) => void;
  placeholder?: string;
}

export function BarcodeReader({ mode, onScan, placeholder }: BarcodeReaderProps): JSX.Element {
  const [inputValue, setInputValue] = useState("");

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue("");
    }
  }

  const defaultPlaceholder =
    mode === "product"
      ? "商品のバーコードをかざしてください"
      : "学生証のナンバーをかざしてください";

  const ICONIFY_BASE = "https://api.iconify.design";
  const ICON_COLOR = encodeURIComponent("#6B7280");

  const modeIcon =
    mode === "product"
      ? `${ICONIFY_BASE}/mdi/barcode-scan.svg?color=${ICON_COLOR}`
      : `${ICONIFY_BASE}/mdi/card-account-details-outline.svg?color=${ICON_COLOR}`;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.placeholder}>{placeholder || defaultPlaceholder}</p>
        <div className={styles.iconWrapper}>
          <img
            src={`${ICONIFY_BASE}/material-symbols/barcode-reader-outline.svg?color=${ICON_COLOR}`}
            alt="バーコードリーダー"
            className={styles.readerIcon}
          />
          <img
            src={modeIcon}
            alt={mode === "product" ? "商品バーコード" : "学生証"}
            className={styles.modeIcon}
          />
        </div>
      </div>
      <Input
        autoFocus
        className={styles.hiddenInput}
        onChange={setInputValue}
        onKeyDown={handleKeyDown}
        value={inputValue}
        type="text"
      />
    </div>
  );
}
