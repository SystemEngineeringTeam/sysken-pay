import { useState, useRef, useCallback, type JSX, type KeyboardEvent } from "react";
import styles from "./BarcodeReader.module.scss";
import { Input } from "../Input";

interface BarcodeReaderProps {
  mode: "product" | "member";
  onScan: (barcode: string) => void;
  placeholder?: string;
}

export function BarcodeReader({ mode, onScan, placeholder }: BarcodeReaderProps): JSX.Element {
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const focusInput = useCallback(() => {
    containerRef.current?.querySelector("input")?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue("");
    }
  }

  const defaultPlaceholder =
    mode === "product"
      ? "商品のバーコードをかざしてください"
      : "学生証のナンバーをかざしてください";

  const modeIcon =
    mode === "product" ? "/icons/Barcord.svg" : "/icons/MemberCard.svg";

  return (
    <div ref={containerRef} className={styles.container} onClick={focusInput}>
      <div className={styles.content}>
        <p className={styles.placeholder}>{placeholder || defaultPlaceholder}</p>
        <div className={styles.iconWrapper}>
          <img
            src="/icons/BarcordReader.svg"
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
        onBlur={focusInput}
        value={inputValue}
        type="text"
      />
    </div>
  );
}
