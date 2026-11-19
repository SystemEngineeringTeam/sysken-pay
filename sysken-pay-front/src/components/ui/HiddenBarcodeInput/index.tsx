import { useRef, useState, type JSX, type KeyboardEvent } from "react";
import { toHalfWidth } from "../../../services/barcodeText";
import styles from "./HiddenBarcodeInput.module.scss";

type Props = {
  onScan: (barcode: string) => void;
};

/**
 * 見えないバーコードの入力欄。リーダーはキーボードとして文字と Enter を送ってくるので、ここで受け取る。
 * 画面にほかのボタンがあっても、押したあとすぐにこの欄へフォーカスを戻す（次の読み取りを取りこぼさないように）
 */
export function HiddenBarcodeInput({ onScan }: Props): JSX.Element {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      onScan(toHalfWidth(value.trim()));
      setValue("");
    }
  };

  return (
    <input
      ref={ref}
      autoFocus
      aria-label="バーコードスキャン入力"
      className={styles.hiddenInput}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      // ボタンを押してフォーカスが外れても、押した処理のあとで戻す
      onBlur={() => setTimeout(() => ref.current?.focus(), 0)}
      type="text"
      autoComplete="off"
    />
  );
}
