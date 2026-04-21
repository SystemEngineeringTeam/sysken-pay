import type { JSX } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.scss";
import { useState } from "react";

interface HeaderProps {
  title: string;
  right?: "setting" | "toTop" | "none";
  shadow?: boolean;
}

function Header({ title, right = "none", shadow = false }: HeaderProps): JSX.Element {
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleConfirm = () => {
    setShowConfirm(false);
    navigate("/");
  }

  return (
    <div
      className={styles.header}
      style={{ boxShadow: shadow ? "0 1.8px 9px 0 #17223330" : "none" }}
    >
      <div className={styles.left}>
        <img src="/icons/Sysken.png" alt="Icon" className={styles.icon} />
        <h1 className={styles.title}>{title}</h1>
      </div>
      {right === "setting" && (
        <Link to="/admin" className={styles.settingLink}>
          <img src="/icons/Setting.svg" alt="Setting" className={styles.setting} />
        </Link>
      )}
      {right === "toTop" && (
        <button
          className={`${styles.link} ${styles.toTopLink}`}
          onClick={() => setShowConfirm(true)}
        >
          <h1 className={styles.toTop}>最初に戻る</h1>
        </button>
      )}

      {showConfirm && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <p className={styles.dialogMessage}>本当に最初から戻りますか？</p>
            <div className={styles.dialogButtons}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowConfirm(false)}
              >
                キャンセル
              </button>
              <button className={styles.confirmButton} onClick={handleConfirm}>
                戻る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Header;
