import { useCallback, useState } from "react";
import { useBalanceStore } from "../store/useBalanceStore";
import { ChargeRepositoryImpl } from "../adapter/repository/ChargeRepositoryImpl";
import type { components } from "../types/api-schema";

type ChargeAmount = components["schemas"]["PostChargeRequest"]["amount"];

export const useCharge = () => {
  const { setBalance } = useBalanceStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charge = useCallback(
    async (userId: string, amount: ChargeAmount) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await ChargeRepositoryImpl.chargeAmount(userId, {
          amount,
        });
        if (data.balance !== undefined) {
          setBalance({ user_id: userId, balance: data.balance });
        }
        return data;
      } catch (e) {
        const message = e instanceof Error ? e.message : "チャージに失敗しました";
        setError(message);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [setBalance]
  );

  const cancelCharge = useCallback(
    async (userId: string, amount: ChargeAmount) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await ChargeRepositoryImpl.chargeCancel(userId, {
          amount,
        });
        if (data.balance !== undefined) {
          setBalance({ user_id: userId, balance: data.balance });
        }
        return data;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "チャージキャンセルに失敗しました";
        setError(message);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [setBalance]
  );

  return { charge, cancelCharge, isLoading, error };
};
