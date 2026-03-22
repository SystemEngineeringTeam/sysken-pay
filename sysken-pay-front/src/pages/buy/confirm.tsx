import { useNavigate } from "react-router-dom";
import Header from "../../components/layouts/Header";
import { PayMethodButtonGroup } from "../../components/features/buy/PayMethodButton";
import Total from "../../components/features/buy/Total";
import ArrowButton from "../../components/ui/ArrowButton";

export default function BuyConfirmPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="決済方法" right="toTop" />
      <div className="flex-1 flex flex-col  gap-8">
        <Total title="決済方法を選択してください" label="お買い上げ金額" />
        <div className="flex justify-center w-full mt-20">
          <PayMethodButtonGroup />
        </div>
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/buy/list")}>
        戻る
      </ArrowButton>
    </div>
  );
}
