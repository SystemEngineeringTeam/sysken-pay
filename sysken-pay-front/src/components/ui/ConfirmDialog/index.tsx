import type { JSX, ReactNode } from "react";
import styles from "./ConfirmDialog.module.scss";

export type ConfirmAction = {
  label: string;
  onClick: () => void;
  /** primary＝青、danger＝赤、plain＝白（やめる など） */
  variant?: "primary" | "danger" | "plain";
};

type Props = {
  title: string;
  children?: ReactNode;
  actions: ConfirmAction[];
  /** 処理中はボタンを押せなくする */
  busy?: boolean;
};

/** 返金・利用停止などの前に出す確認の画面 */
export const ConfirmDialog = ({ title, children, actions, busy = false }: Props): JSX.Element => (
  <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
    <div className={styles.dialog}>
      <p className={styles.title}>{title}</p>
      {children && <div className={styles.body}>{children}</div>}
      <div className={styles.actions}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`${styles.action} ${styles[a.variant ?? "primary"]}`}
            onClick={a.onClick}
            disabled={busy}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);
