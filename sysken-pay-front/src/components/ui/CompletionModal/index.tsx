import Button from "../Button";
import styles from "./CompletionModal.module.scss";

type Mode = "userRegister" | "itemRegister" | "itemUpdate";

type Props = {
  mode: Mode;
  name?: string;
  price?: number;
  onClose: () => void;
};

export const CompletionModal = ({ mode, name, price, onClose }: Props) => {
  const highlight =
    mode === "userRegister" ? `${name}さん` : `${name} ¥${price}`;

  const action = mode === "itemUpdate" ? "更新" : "登録";

  const isAdmin = mode === "itemRegister" || mode === "itemUpdate";

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <p className={styles.message}>
          <span className={styles.name}>{highlight}</span>
          <br />の{action}が完了しました
        </p>
        <Button size="md" onClick={onClose}>
          {isAdmin ? "メニューへ戻る" : "ホームへ戻る"}
        </Button>
      </div>
    </div>
  );
};
