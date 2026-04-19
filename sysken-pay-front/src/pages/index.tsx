import type { JSX } from "react";
import Header from "../components/layouts/Header";
import { HomeButtons } from "../components/features/home/HomeButtons";
import styles from "./index.module.scss";

export default function Home(): JSX.Element {
  return (
    <div className={styles.container}>
      <Header title="シス研Pay" right="setting" shadow={true} />
      <main className={styles.main}>
        <HomeButtons />
      </main>
    </div>
  );
}
