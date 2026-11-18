import type { Member } from "../adapter/repository/MemberRepositoryImpl";

/** ユーザー一覧のタブ。"stopped"（停止中）はタブには並べず、「全員」の右下のボタンから入る */
export type MemberTab = "all" | "unrefunded" | "graduation" | "stopped";

export const MEMBER_TABS: { key: "all" | "unrefunded" | "graduation"; label: string }[] = [
  { key: "all", label: "全員" },
  { key: "unrefunded", label: "未返金" },
  { key: "graduation", label: "卒業候補" },
];

/** タブに出す人だけにする */
export const filterMembers = (members: Member[], tab: MemberTab): Member[] => {
  switch (tab) {
    case "unrefunded":
      return members.filter((m) => m.unrefunded);
    case "graduation":
      return members.filter((m) => m.graduation_candidate);
    case "stopped":
      return members.filter((m) => m.status === "stopped");
    default:
      // 「全員」は使える人だけ。止めた人は「停止中」に分ける
      return members.filter((m) => m.status !== "stopped");
  }
};

/** タブごとの人数 */
export const countMembers = (members: Member[]): Record<MemberTab, number> => ({
  all: filterMembers(members, "all").length,
  unrefunded: filterMembers(members, "unrefunded").length,
  graduation: filterMembers(members, "graduation").length,
  stopped: filterMembers(members, "stopped").length,
});

/** 名前か学籍番号に、検索の文字が入っている人だけにする（大文字・小文字は区別しない） */
export const searchMembers = (members: Member[], query: string): Member[] => {
  const q = query.trim().toLowerCase();
  if (!q) return members;
  return members.filter(
    (m) => m.user_id.toLowerCase().includes(q) || m.user_name.toLowerCase().includes(q),
  );
};

/** 金額を「¥1,230」の形にする */
export const formatYen = (amount: number): string => `¥${amount.toLocaleString("ja-JP")}`;

/** 一覧の行に出す状態の札。出さないときは null */
export const memberBadge = (m: Member): { label: string; tone: "red" | "gray" | "blue" } | null => {
  if (m.unrefunded) return { label: "未返金", tone: "red" };
  if (m.status === "stopped") return { label: "停止中", tone: "gray" };
  if (!m.has_payment_card) return { label: "バーコードなし", tone: "blue" };
  return null;
};
