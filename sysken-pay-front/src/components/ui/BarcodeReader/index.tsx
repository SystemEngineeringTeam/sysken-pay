import { useState, useRef, useCallback, type JSX, type KeyboardEvent, type ReactNode } from "react";
import styles from "./BarcodeReader.module.scss";
import { Input } from "../Input";
import { toHalfWidth } from "../../../services/barcodeText";

interface BarcodeReaderProps {
  mode: "product" | "member";
  onScan: (barcode: string) => void;
  placeholder?: string;
  /** 読み取りに失敗したときの案内。見出しのすぐ下に出す（画面の下だと「戻る」と重なるため） */
  error?: ReactNode;
  /** 画面の下に小さく添える補足（目立たせたくない案内用） */
  hint?: string;
}

export function BarcodeReader({ mode, onScan, placeholder, error, hint }: BarcodeReaderProps): JSX.Element {
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const focusInput = useCallback(() => {
    containerRef.current?.querySelector("input")?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      onScan(toHalfWidth(inputValue.trim()));
      setInputValue("");
    }
  }

  const defaultPlaceholder =
    mode === "product"
      ? "商品のバーコードをかざしてください"
      : "シス研Payのバーコードをかざしてください";

  const modeIcon =
    mode === "product" ? "/icons/Barcord.svg" : "/icons/MemberCard.svg";

  return (
    <div ref={containerRef} className={styles.container} onClick={focusInput}>
      <div className={styles.content}>
        <div className={styles.head}>
          <p className={styles.placeholder}>{placeholder || defaultPlaceholder}</p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
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
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
      <Input
        autoFocus
        aria-label="バーコードスキャン入力"
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
