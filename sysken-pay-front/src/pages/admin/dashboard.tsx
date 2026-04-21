import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header";
import ArrowButton from "../../components/ui/ArrowButton";
import Button from "../../components/ui/Button";
import styles from "./dashboard.module.scss";

export default function AdminDashboard(): JSX.Element {
  const navigate = useNavigate();

  const handleAdmin = () => {
    navigate("/admin");
  }

  return (
    <div className={styles.container}>
      <Header title="管理者" />
      <div className={styles.content}>
        <Button size="lg" onClick={() => navigate("/admin/user-register")}>
          ユーザー登録
        </Button>
        <Button size="lg" onClick={() => navigate("/admin/item-register")}>
          商品登録
        </Button>
        <Button size="lg" onClick={() => navigate("/admin/item-update")}>
          商品更新
        </Button>
      </div>
      <ArrowButton variant="prev" onClick={handleAdmin}>
        戻る
      </ArrowButton>
    </div>
  );
}
