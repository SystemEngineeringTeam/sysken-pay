import { useNavigate } from "react-router-dom";
import Headers from "../../components/layouts/Header/index";
import Button from "../../components/ui/Button/index";
import ArrowButton from "../../components/ui/ArrowButton";

export default function Admin() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Headers title="管理者" />
      <div className="flex-1 flex flex-col items-center justify-center gap-10 mb-20">
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
      <ArrowButton
        variant="prev"
        onClick={() => navigate("/admin")}
      >
        戻る
      </ArrowButton>
    </div>
  );
}
