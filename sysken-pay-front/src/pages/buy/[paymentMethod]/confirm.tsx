import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import Button from "../../../components/ui/Button";
import ArrowButton from "../../../components/ui/ArrowButton";
import SysPayConfirm from "../../../components/features/buy/SysPayConfirm";

export default function SysPayConfirmPage() {
  const navigate = useNavigate();

  // TODO: APIからユーザーの残高を取得
  const balance = 1000;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="購入確定" right="toTop" />
      <div className="flex-1 flex flex-col items-center justify-start gap-8">
        <SysPayConfirm balance={balance} />
      </div>
      <div className="flex justify-center pb-19">
        <Button onClick={() => navigate("/buy/complete")}>購入</Button>
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/buy/syspay")}>
        戻る
      </ArrowButton>
    </div>
  );
}
