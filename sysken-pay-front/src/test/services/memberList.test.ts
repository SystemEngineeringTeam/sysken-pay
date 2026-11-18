import { describe, expect, it } from "vitest";
import type { Member } from "../../adapter/repository/MemberRepositoryImpl";
import {
  countMembers,
  filterMembers,
  formatYen,
  memberBadge,
  searchMembers,
} from "../../services/memberList";

const m = (over: Partial<Member>): Member => ({
  user_id: "24K00001",
  user_name: "k24000_yamadataro",
  balance: 0,
  status: "active",
  stopped_at: null,
  has_payment_card: true,
  unrefunded: false,
  graduation_candidate: false,
  ...over,
});

const members = [
  m({ user_id: "22K00001", user_name: "k22000_sato", graduation_candidate: true }),
  m({ user_id: "23K00002", user_name: "k23000_suzuki", status: "stopped", balance: 500, unrefunded: true }),
  m({ user_id: "24K00003", user_name: "k24000_tanaka" }),
];

describe("filterMembers / countMembers", () => {
  it("タブごとに絞り込む", () => {
    expect(filterMembers(members, "all").map((x) => x.user_id)).toEqual(["22K00001", "24K00003"]);
    expect(filterMembers(members, "stopped").map((x) => x.user_id)).toEqual(["23K00002"]);
    expect(filterMembers(members, "unrefunded").map((x) => x.user_id)).toEqual(["23K00002"]);
    expect(filterMembers(members, "graduation").map((x) => x.user_id)).toEqual(["22K00001"]);
  });

  it("人数を数える", () => {
    expect(countMembers(members)).toEqual({ all: 2, unrefunded: 1, graduation: 1, stopped: 1 });
  });
});

describe("searchMembers", () => {
  it("名前と学籍番号で探す（大文字・小文字は区別しない）", () => {
    expect(searchMembers(members, "SUZUKI").map((x) => x.user_id)).toEqual(["23K00002"]);
    expect(searchMembers(members, "24k").map((x) => x.user_id)).toEqual(["24K00003"]);
    expect(searchMembers(members, "  ")).toHaveLength(3);
  });
});

describe("formatYen", () => {
  it("3桁ごとに区切る", () => {
    expect(formatYen(1230)).toBe("¥1,230");
    expect(formatYen(0)).toBe("¥0");
  });
});

describe("memberBadge", () => {
  it("未返金 > 停止中 > バーコードなし の順に出す", () => {
    expect(memberBadge(m({ status: "stopped", unrefunded: true }))?.label).toBe("未返金");
    expect(memberBadge(m({ status: "stopped" }))?.label).toBe("停止中");
    expect(memberBadge(m({ has_payment_card: false }))?.label).toBe("バーコードなし");
    expect(memberBadge(m({}))).toBeNull();
  });
});
