import { create } from "zustand";
import type { UserBalance } from "../types/domain/User";

type BalanceStore = {
  balance: UserBalance | null;
  setBalance: (balance: UserBalance) => void;
  clearBalance: () => void;
};

export const useBalanceStore = create<BalanceStore>((set) => ({
  balance: null,
  setBalance: (balance) => set({ balance }),
  clearBalance: () => set({ balance: null }),
}));
