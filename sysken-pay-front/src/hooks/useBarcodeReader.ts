import { useState, useCallback } from "react";
import { UserRepositoryImpl } from "../adapter/repository/UserRepositoryImpl";
import { ItemRepositoryImpl } from "../adapter/repository/ItemRepositoryImpl";
import type { components } from "../types/api-schema";

type User = components["schemas"]["GetBalanceResponse"];
type Item = components["schemas"]["GetItemResponse"];

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
          const data = await ItemRepositoryImpl.getItemByJanCode(barcode);
          if (!data?.item_id) throw new Error("商品が見つかりませんでした");
          setItem(data);
        } else {
          const data = await UserRepositoryImpl.getBalance(barcode);
          if (!data?.user_id) throw new Error("ユーザーが見つかりませんでした");
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

  return { user, item, isLoading, error, handleBarcodeScan, reset };
}
