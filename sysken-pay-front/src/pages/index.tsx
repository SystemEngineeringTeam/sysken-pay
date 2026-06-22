import type { JSX } from "react";
import Header from "../components/layouts/Header";
import { ChargeButton } from "../components/features/home/ChargeButton";
import { BarcodeReader } from "../components/ui/BarcodeReader";
import { useProductScan } from "../hooks/useBarcodeReader";
import styles from "./index.module.scss";

export default function Home(): JSX.Element {
  const { onScan, ErrorMessage } = useProductScan();

  return (
    <div className={styles.container}>
      <Header title="シス研Pay" right="setting" shadow={true} />
      <main className={styles.main}>
        <BarcodeReader mode="product" onScan={onScan} />
        <ErrorMessage />
        <ChargeButton />
      </main>
    </div>
  );
}
