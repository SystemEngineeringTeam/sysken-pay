import { useState, useCallback } from "react";
import type { User } from "../types/domain/User";
import type { Item } from "../types/domain/Item";

export function useBarcodeReader(mode: "product" | "member") {
  const [user, setUser] = useState<User | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      setIsLoading(true);
      setError(null);

      try {
        if (mode === "product") {
          // JANコードから商品情報を取得
          // const response = await fetchItemByJanCode(barcode);
          // const data = await response.json();

          // ダミーデータ（実装時はAPIレスポンスに置き換え）
          const data: Item = {
            id: "item-1",
            janCode: barcode,
            name: "商品名",
            price: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          setItem(data);
        } else {
          // 学生証番号からユーザー情報を取得
          // const response = await fetchUserByMemberId(barcode);
          // const data = await response.json();

          // ダミーデータ（実装時はAPIレスポンスに置き換え）
          const data: User = {
            userId: barcode,
            userName: "山田太郎",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          setUser(data);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "バーコード読み込みエラー"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [mode]
  );

  const reset = useCallback(() => {
    setUser(null);
    setItem(null);
    setError(null);
  }, []);

  return {
    user,
    item,
    isLoading,
    error,
    handleBarcodeScan,
    reset,
  };
}
