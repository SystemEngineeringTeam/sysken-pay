import { useEffect, useState, type JSX } from "react";
import QRCode from "qrcode";
import styles from "./QrCode.module.scss";

interface QrCodeProps {
  value: string;
  /** 読み上げ用の説明 */
  label: string;
}

/** 文字列を QR コードの画像にして表示する（SVG なので拡大してもぼやけない） */
export function QrCode({ value, label }: QrCodeProps): JSX.Element {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: "svg", margin: 2, errorCorrectionLevel: "M" })
      .then((svg) => {
        if (!cancelled) setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className={styles.frame}>
      {src ? <img className={styles.image} src={src} alt={label} /> : <div className={styles.placeholder} />}
    </div>
  );
}

export default QrCode;
