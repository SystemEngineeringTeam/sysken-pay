import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import Button from "../../components/ui/Button/index";
import ArrowButton from "../../components/ui/ArrowButton";
import styles from "./menu.module.scss";

export default function AdminMenu(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <Header title="管理者" />
      <div className={styles.content}>
        <Button size="md" onClick={() => navigate("/admin/user-register")}>
          ユーザー登録
        </Button>
        <Button size="md" onClick={() => navigate("/admin/item-register")}>
          商品登録
        </Button>
        <Button size="md" onClick={() => navigate("/admin/item-update")}>
          商品更新
        </Button>
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin")}>
        戻る
      </ArrowButton>
    </div>
  );
}
