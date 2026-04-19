import { create } from "zustand";
import type { components } from "../types/api-schema";

type Balance = components["schemas"]["GetBalanceResponse"];

type BalanceStore = {
  balance: Balance | null;
  setBalance: (balance: Balance) => void;
  clearBalance: () => void;
};

export const useBalanceStore = create<BalanceStore>((set) => ({
  balance: null,
  setBalance: (balance) => set({ balance }),
  clearBalance: () => set({ balance: null }),
}));
