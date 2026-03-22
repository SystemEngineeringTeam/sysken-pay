import { create } from "zustand";

type ChargeStore = {
  chargeAmount: number;
  setChargeAmount: (amount: number) => void;
  clearChargeAmount: () => void;
};

export const useChargeStore = create<ChargeStore>((set) => ({
  chargeAmount: 0,
  setChargeAmount: (amount) => set({ chargeAmount: amount }),
  clearChargeAmount: () => set({ chargeAmount: 0 }),
}));
