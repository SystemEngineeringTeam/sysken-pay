import { create } from "zustand";
import type { Member } from "../adapter/repository/MemberRepositoryImpl";
import type { MemberTab } from "../services/memberList";

type MemberStore = {
  members: Member[];
  setMembers: (members: Member[]) => void;
  /** 詳細から一覧に戻ったときに、同じタブを出すため */
  tab: MemberTab;
  setTab: (tab: MemberTab) => void;
};

export const useMemberStore = create<MemberStore>((set) => ({
  members: [],
  setMembers: (members) => set({ members }),
  tab: "all",
  setTab: (tab) => set({ tab }),
}));
