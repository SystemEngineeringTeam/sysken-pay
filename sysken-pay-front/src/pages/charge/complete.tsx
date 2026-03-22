import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { useBalanceStore } from "../../store/useBalanceStore";

export default function Charge() {
  const navigate = useNavigate();

  const handleHome = () => {
    navigate("/");
  };
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex flex-col items-center justify-center gap-8 h-full">
        <div className="text-6xl font-bold  text-[#454a53] mb-13 mt-50">
          チャージが完了しました
        </div>
        <div className="text-4xl font-bold  text-[#BD2929] mb-20">
          現在のカード残高　￥
          {useBalanceStore((state) => state.balance?.balance ?? 0)}
        </div>
        <Button onClick={handleHome}>ホームへ戻る</Button>
      </div>
    </div>
  );
}
