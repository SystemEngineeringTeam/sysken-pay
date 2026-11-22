// ユーザー一覧のタブ・検索・表示用の整形。画面に依存しない関数だけを置く（ラズパイのフロントの services/memberList.ts と同じ決まり）。

export type Member = {
  user_id: string;
  user_name: string;
  balance: number;
  status: "active" | "stopped";
  stopped_at: string | null;
  has_payment_card: boolean;
  unrefunded: boolean;
  graduation_candidate: boolean;
  hidden: boolean;
  deletable: boolean;
};

export type MemberTab = "all" | "unrefunded" | "graduation" | "stopped";

export const MEMBER_TABS: { key: "all" | "unrefunded" | "graduation"; label: string }[] = [
  { key: "all", label: "全員" },
  { key: "unrefunded", label: "未返金" },
  { key: "graduation", label: "卒業候補" },
];

export const filterMembers = (members: Member[], tab: MemberTab): Member[] => {
  switch (tab) {
    case "unrefunded":
      return members.filter((m) => m.unrefunded);
    case "graduation":
      return members.filter((m) => m.graduation_candidate);
    case "stopped":
      // 以前に「非表示」にした人も、停止中に入れる（非表示の機能はやめた）
      return members.filter((m) => m.status === "stopped");
    default:
      // 「全員」は使える人だけ。止めた人は「停止中」に分ける
      return members.filter((m) => m.status !== "stopped");
  }
};

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
  return members.filter((m) => m.user_id.toLowerCase().includes(q) || m.user_name.toLowerCase().includes(q));
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
