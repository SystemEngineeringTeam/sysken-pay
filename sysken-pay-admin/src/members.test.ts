import { describe, expect, it } from "vitest";
import { countMembers, filterMembers, formatYen, memberBadge, searchMembers, type Member } from "./members";

const m = (o: Partial<Member>): Member => ({
  user_id: "24K00001",
  user_name: "k24000_yamada",
  balance: 0,
  status: "active",
  stopped_at: null,
  has_payment_card: true,
  unrefunded: false,
  graduation_candidate: false,
  hidden: false,
  deletable: false,
  ...o,
});

const active = m({ user_id: "24K00001" });
const stopped = m({ user_id: "21K00002", status: "stopped", stopped_at: "2026-03-31T00:00:00Z" });
const unrefunded = m({ user_id: "21K00003", status: "stopped", balance: 300, unrefunded: true });
const hidden = m({ user_id: "21K00004", status: "stopped", hidden: true });
const grad = m({ user_id: "21K00005", graduation_candidate: true });
const all = [active, stopped, unrefunded, hidden, grad];

describe("filterMembers", () => {
  it("全員は使える人だけ", () => expect(filterMembers(all, "all")).toEqual([active, grad]));
  it("停止中は、以前に非表示にした人も含める", () => expect(filterMembers(all, "stopped")).toEqual([stopped, unrefunded, hidden]));
  it("未返金・卒業候補", () => {
    expect(filterMembers(all, "unrefunded")).toEqual([unrefunded]);
    expect(filterMembers(all, "graduation")).toEqual([grad]);
  });
  it("件数", () => expect(countMembers(all)).toEqual({ all: 2, unrefunded: 1, graduation: 1, stopped: 3 }));
});

describe("searchMembers", () => {
  it("大文字小文字を区別せず、名前か学籍番号で探す", () => {
    expect(searchMembers(all, "21k00003")).toEqual([unrefunded]);
    expect(searchMembers(all, "YAMADA")).toHaveLength(5);
    expect(searchMembers(all, "  ")).toEqual(all);
    expect(searchMembers(all, "zzz")).toEqual([]);
  });
});

describe("formatYen / memberBadge", () => {
  it("¥ とカンマ", () => expect(formatYen(1230)).toBe("¥1,230"));
  it("札", () => {
    expect(memberBadge(unrefunded)).toEqual({ label: "未返金", tone: "red" });
    expect(memberBadge(hidden)).toEqual({ label: "停止中", tone: "gray" });
    expect(memberBadge(stopped)).toEqual({ label: "停止中", tone: "gray" });
    expect(memberBadge(m({ has_payment_card: false }))).toEqual({ label: "バーコードなし", tone: "blue" });
    expect(memberBadge(active)).toBeNull();
  });
});
