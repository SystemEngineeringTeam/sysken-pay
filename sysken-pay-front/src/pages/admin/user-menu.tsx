import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header/index";
import Button from "../../components/ui/Button/index";
import ArrowButton from "../../components/ui/ArrowButton";
import styles from "./menu.module.scss";

export default function AdminUserMenu(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <Header title="ユーザー設定" />
      <div className={styles.content}>
        <Button size="lg" onClick={() => navigate("/admin/user-list")}>
          一覧
        </Button>
        <Button size="lg" onClick={() => navigate("/admin/user-register")}>
          登録
        </Button>
        <Button size="lg" onClick={() => navigate("/admin/user-update")}>
          更新
        </Button>
        <Button size="lg" onClick={() => navigate("/admin/phone-register")}>
          バーコード再発行
        </Button>
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/menu")}>
        戻る
      </ArrowButton>
    </div>
  );
}
