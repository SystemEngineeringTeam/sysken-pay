import { useState, type JSX } from "react";
import { BarcodeReader } from "../../components/ui/BarcodeReader";
import Header from "../../components/layouts/Header";
import { useNavigate } from "react-router-dom";
import { useItemStore } from "../../store/useItemStore";
import ArrowButton from "../../components/ui/ArrowButton";

export default function Buy(): JSX.Element {
  const [mode] = useState<"product" | "member">("product");
  const navigate = useNavigate();
  const addItem = useItemStore((state) => state.addItem);

  const handleScan = (barcode: string) => {
    console.log("スキャンされたバーコード:", barcode);
    // TODO: barcodeを使ってAPIから商品情報を取得してaddItem
    addItem({
      id: barcode,
      name: "商品名",
      price: 100,
      janCode: barcode,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // バーコード処理後の/buy/listへ遷移
    navigate("/buy/list");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="商品購入" />
      <div className="flex flex-1 items-center justify-center">
        <BarcodeReader
          mode={mode}
          onScan={handleScan}
          placeholder="商品のバーコードをかざしてください"
        />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/")}>
        戻る
      </ArrowButton>
    </div>
  );
}
