import Header from "../../components/layouts/Header/index";
import { BarcodeReader } from "../../components/ui/BarcodeReader";
import { useNavigate } from "react-router-dom";
import ArrowButton from "../../components/ui/ArrowButton";
import { useBalanceStore } from "../../store/useBalanceStore";

export default function Charge() {
  const navigate = useNavigate();
  const setBalance = useBalanceStore((state) => state.setBalance);

  const handleScan = (barcode: string) => {
    // TODO: APIから残高を参照
    setBalance({
      userId: barcode,
      balance: 550,
    });
    navigate("/charge/select");
  };
  const handleHome = () => {
    navigate("/");
  };
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="チャージ" />
      <div className="flex-1 flex flex-col items-center justify-center">
        <BarcodeReader
          mode="member"
          onScan={handleScan}
          placeholder="学生証のバーコードをかざしてください"
        />
      </div>
      <ArrowButton variant="prev" onClick={handleHome}>
        戻る
      </ArrowButton>
    </div>
  );
}
