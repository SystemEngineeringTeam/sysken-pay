import Header from "../../components/layouts/Header";
import ArrowButton from "../../components/ui/ArrowButton";
import Button from "../../components/ui/Button";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const navigate = useNavigate();
  const handleAdmin = () => {
    navigate("/admin");
  };
  return (
    <div>
      <Header title="管理者" />
      <Button size="lg" onClick={() => navigate("/admin/user-register")}>
        ユーザー登録
      </Button>
      <Button size="lg" onClick={() => navigate("/admin/item-register")}>
        商品登録
      </Button>
      <Button size="lg" onClick={() => navigate("/admin/item-update")}>
        商品更新
      </Button>
      <ArrowButton variant="prev" onClick={handleAdmin}>
        戻る
      </ArrowButton>
    </div>
  );
}
