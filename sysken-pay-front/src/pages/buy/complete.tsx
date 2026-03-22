import { useNavigate } from "react-router-dom";
import { useItemStore } from "../../store/useItemStore";
import Button from "../../components/ui/Button";

export default function BuyCompletePage() {
  const navigate = useNavigate();
  const clearItems = useItemStore((state) => state.clearItems);

  const handleHome = () => {
    clearItems();
    navigate("/");
  };

  return (
    <div className="flex flex-col h-screen items-center justify-center gap-8">
      <h1 className="text-[3vw] font-bold text-blue-400 m-0">
        お買い上げありがとうございました！
      </h1>
      <p className="text-[1.5vw] text-gray-400 text-center leading-relaxed">
        ご不明点や商品のご希望がありましたら、〇〇までお申し付けください
        <br />
        またのご利用お待ちしております
      </p>
      <Button size="lg" onClick={handleHome}>
        ホームへ戻る
      </Button>
    </div>
  );
}
