import { create } from "zustand";
import type { User } from "../types/domain/User";

type UserStore = {
  scannedUser: User | null;
  setScannedUser: (user: User) => void;
  clearScannedUser: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  scannedUser: null,
  setScannedUser: (user) => set({ scannedUser: user }),
  clearScannedUser: () => set({ scannedUser: null }),
}));
