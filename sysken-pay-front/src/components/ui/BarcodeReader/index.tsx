import type { JSX } from "react";
import BarcodeReaderSvg from "/icons/BarcodeReader.svg";
import BarcodeSvg from "/icons/Barcode.svg";
import MemberCardSvg from "/icons/MemberCard.svg";
import styles from "./BarcodeReader.module.scss";
import { useBarcodeReader } from "../../../hooks/useBarcodeReader";

interface BarcodeReaderProps {
  mode: "product" | "member";
  onScan: (barcode: string) => void;
  placeholder?: string;
}

export function BarcodeReader({
  mode,
  onScan,
  placeholder,
}: BarcodeReaderProps): JSX.Element {
  const { handleBarcodeScan } = useBarcodeReader(mode);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    if (value) {
      handleBarcodeScan(value);
      onScan(value);
      e.currentTarget.value = "";
    }
  };

  const defaultPlaceholder =
    mode === "product"
      ? "商品のバーコードをかざしてください"
      : "学生証のナンバーをかざしてください";

  const modeIcon = mode === "product" ? BarcodeSvg : MemberCardSvg;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.placeholder}>
          {placeholder || defaultPlaceholder}
        </p>
        <div className={styles.iconWrapper}>
          <img src={BarcodeReaderSvg} alt="バーコードリーダー" />
          <img
            src={modeIcon}
            alt={mode === "product" ? "商品バーコード" : "学生証"}
          />
        </div>
      </div>
      <input
        autoFocus
        className={styles.hiddenInput}
        onChange={handleInput}
        type="text"
      />
    </div>
  );
}
