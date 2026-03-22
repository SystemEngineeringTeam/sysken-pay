import { useNavigate } from "react-router-dom";
import { ItemList } from "../../components/features/buy/ItemList";
import { useItemStore } from "../../store/useItemStore";
import Header from "../../components/layouts/Header";
import ArrowButton from "../../components/ui/ArrowButton";

export default function BuyListPage() {
  const navigate = useNavigate();
  const { items, removeItem } = useItemStore();

  return (
    <div className="flex flex-col h-screen overflow-hidde">
      <Header title="商品購入" right="toTop" />
      <div className="flex-1 flex flex-col items-center justify-start pt-10 gap-4 overflow-hidden">
        <ItemList Items={items} onDelete={removeItem} />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/buy")}>
        戻る
      </ArrowButton>
      <ArrowButton variant="next" onClick={() => navigate("/buy/confirm")}>
        次へ
      </ArrowButton>
    </div>
  );
}
