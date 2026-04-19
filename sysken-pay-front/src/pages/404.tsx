import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import styles from "./404.module.scss";

export default function NotFoundPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>ページが見つかりません</h1>
        <p className={styles.message}>お探しのページは存在しないか、移動した可能性があります。</p>
        <Button size="lg" onClick={() => navigate("/")}>
          ホームへ戻る
        </Button>
      </div>
    </div>
  );
}
