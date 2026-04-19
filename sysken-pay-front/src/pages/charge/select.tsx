import Header from "../../components/layouts/Header/index";
import { useNavigate } from "react-router-dom";
import ArrowButton from "../../components/ui/ArrowButton";
import { SelectButtonGroup } from "../../components/features/charge/SelectButton";
import { PriceLabel } from "../../components/ui/PriceLabel";
import { Input } from "../../components/ui/Input";
import { useBalanceStore } from "../../store/useBalanceStore";
import { useState } from "react";
import { useChargeStore } from "../../store/useChargeStore";

export default function ChargeSelectPage() {
  const navigate = useNavigate();
  const balance = useBalanceStore((state) => state.balance?.balance ?? 0);
  const saveChargeAmount = useChargeStore((state) => state.setChargeAmount);
  const [chargeAmount, setChargeAmount] = useState("");

  const handleNext = () => {
    const normalizedChargeAmount =
      Number(chargeAmount.replace(/[^\d]/g, "")) || 0;
    saveChargeAmount(normalizedChargeAmount);
    navigate("/charge/insert");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="チャージ金額" />
      <div className="flex-1 flex flex-col items-center justify-center gap-8 pb-[10vh]">
        <div className="flex flex-col items-center gap-4 pb-[7vh]">
          <PriceLabel label="残高" price={balance} />
          <div className="text-4xl font-bold text-center my-4 text-[#454a53]">
            チャージ金額を選択してください
          </div>
          <div className="w-3/4 mx-auto">
            <Input
              value={chargeAmount === "" ? "" : `￥${chargeAmount}`}
              onChange={setChargeAmount}
            />
          </div>
        </div>
        <SelectButtonGroup onSelectAmount={setChargeAmount} />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/charge")}>
        戻る
      </ArrowButton>
      <ArrowButton variant="next" onClick={handleNext}>
        次へ
      </ArrowButton>
    </div>
  );
}
