import { useState } from "react";
import { BarcodeReader } from "../../../components/ui/BarcodeReader";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import { useItemStore } from "../../../store/useItemStore";
import ArrowButton from "../../../components/ui/ArrowButton";

export default function ItemUpdatePage() {
  const [mode] = useState<"product" | "member">("product");
  const navigate = useNavigate();
  const updateItem = useItemStore((state) => state.updateItem);

  const handleScan = (barcode: string) => {
    console.log("スキャンされたバーコード:", barcode);
    // TODO: barcodeを使ってAPIから商品情報を取得してupdateItem
    updateItem({
      id: barcode,
      janCode: barcode,
      name: "商品名",
      price: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    navigate("/admin/item-update/info");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="商品更新" />
      <div className="flex flex-1 items-center justify-center">
        <BarcodeReader
          mode={mode}
          onScan={handleScan}
          placeholder="商品のバーコードをかざしてください"
        />
      </div>
      <ArrowButton variant="prev" onClick={() => navigate("/admin/menu")}>
        戻る
      </ArrowButton>
    </div>
  );
}
