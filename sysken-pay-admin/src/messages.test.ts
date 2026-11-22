import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { isValidStudentId, toAdminErrorMessage, toItemErrorMessage, toMemberErrorMessage } from "./messages";

describe("toMemberErrorMessage", () => {
  it("409 は操作ごとに文言が変わる", () => {
    const e = new ApiError("request", "x", 409);
    expect(toMemberErrorMessage("refund", e)).toContain("0 円");
    expect(toMemberErrorMessage("update", e)).toContain("別のユーザー");
    expect(toMemberErrorMessage("register", e)).toContain("もう別のユーザー");
    expect(toMemberErrorMessage("register", new ApiError("request", "x", 400))).toContain("形が正しくありません");
    expect(toMemberErrorMessage("register", new ApiError("request", "x", 404))).toContain("登録できませんでした");
    expect(toMemberErrorMessage("delete", e)).toContain("記録がある");
    expect(toMemberErrorMessage("hide", e)).toContain("残高が 0 円");
    expect(toMemberErrorMessage("unhide", e)).toContain("非表示になっていません");
  });
  it("403 は再発行のときだけ利用停止の案内", () => {
    const e = new ApiError("request", "x", 403);
    expect(toMemberErrorMessage("issue", e)).toContain("利用停止");
    expect(toMemberErrorMessage("refund", e)).toBe("返金できませんでした。もう一度お試しください。");
  });
  it("パスワード切れ・通信できない・不明", () => {
    expect(toMemberErrorMessage("stop", new ApiError("unauthorized", "x", 401))).toContain("ログインし直");
    expect(toMemberErrorMessage("stop", new ApiError("network", "つながりません"))).toBe("つながりません");
    expect(toMemberErrorMessage("stop", new Error("?"))).toContain("利用停止できませんでした");
  });
});

describe("isValidStudentId", () => {
  it("24K01234 の形", () => {
    expect(isValidStudentId("24K01234")).toBe(true);
    expect(isValidStudentId(" 24k01234 ")).toBe(true);
    expect(isValidStudentId("K2401234")).toBe(false);
    expect(isValidStudentId("")).toBe(false);
    expect(isValidStudentId(`24K${"1".repeat(20)}`)).toBe(false);
  });
});

describe("toItemErrorMessage", () => {
  it("409 は操作ごとに文言が変わる", () => {
    const e = new ApiError("request", "x", 409);
    expect(toItemErrorMessage("disable", e)).toContain("すでに無効");
    expect(toItemErrorMessage("enable", e)).toContain("無効になっていません");
  });
  it("404 は登録されていない", () => {
    expect(toItemErrorMessage("enable", new ApiError("request", "x", 404))).toContain("登録されていません");
  });
  it("401 は確認が切れた案内、その他は操作ごとの定型文", () => {
    expect(toItemErrorMessage("disable", new ApiError("unauthorized", "x"))).toContain("ログインし直して");
    expect(toItemErrorMessage("disable", new Error("boom"))).toContain("無効にできませんでした");
    expect(toItemErrorMessage("enable", new Error("boom"))).toContain("有効にできませんでした");
  });
});

describe("toAdminErrorMessage", () => {
  it("409 は足す・外すで文言が変わる", () => {
    const e = new ApiError("request", "x", 409);
    expect(toAdminErrorMessage("add", e)).toContain("すでに許可");
    expect(toAdminErrorMessage("remove", e)).toContain("システムアカウント");
  });
  it("400（足す）・404（外す）・その他", () => {
    expect(toAdminErrorMessage("add", new ApiError("request", "x", 400))).toContain("UPN");
    expect(toAdminErrorMessage("remove", new ApiError("request", "x", 404))).toContain("すでに許可リストにいません");
    expect(toAdminErrorMessage("list", new Error("boom"))).toContain("読み込めません");
    expect(toAdminErrorMessage("add", new ApiError("unauthorized", "x"))).toContain("ログインし直して");
  });
});
