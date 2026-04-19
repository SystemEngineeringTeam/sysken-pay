import { create } from "zustand";
import type { components } from "../types/api-schema";

type User = components["schemas"]["PostUserResponse"];

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
