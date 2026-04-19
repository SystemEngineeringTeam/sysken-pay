import Header from "../../components/layouts/Header/index";
import { useNavigate } from "react-router-dom";
import ArrowButton from "../../components/ui/ArrowButton";
import { PriceLabel } from "../../components/ui/PriceLabel";
import { useChargeStore } from "../../store/useChargeStore";
import { useBalanceStore } from "../../store/useBalanceStore";

export default function ChargeInsertPage() {
  const navigate = useNavigate();
  const chargeAmount = useChargeStore((state) => state.chargeAmount);
  const setBalance = useBalanceStore((state) => state.setBalance);

  const handleNext = (barcode: string) => {
    // TODO: APIから残高を参照
    setBalance({
      userId: barcode,
      balance: 550,
    });
    navigate("/charge/complete");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="チャージ金額" />
      <div className="flex-1 flex flex-col items-center justify-center gap-8 pb-[10vh]">
        <div className="text-6xl text-center font-bold text-center text-[#454a53]">
          箱にお金を入れてください
        </div>
        <PriceLabel label="チャージ金額" price={chargeAmount} />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/charge/select")}>
        戻る
      </ArrowButton>
      <ArrowButton variant="next" onClick={() => handleNext("user123")}>
        完了
      </ArrowButton>
    </div>
  );
}
