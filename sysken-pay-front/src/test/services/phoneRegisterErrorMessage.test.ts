import { describe, it, expect } from "vitest";
import { ApiError } from "../../adapter/api/ApiError";
import { formatRemaining, toPhoneRegisterErrorMessage } from "../../services/phoneRegisterErrorMessage";

describe("toPhoneRegisterErrorMessage", () => {
  it.each([
    [404, "登録されていない学生証です"],
    [400, "読み取れませんでした"],
    [401, "管理者パスワードの確認が切れました"],
    [503, "PUBLIC_BASE_URL"],
  ])("%i", (status, part) => {
    expect(toPhoneRegisterErrorMessage(new ApiError("x", status))).toContain(part);
  });

  it("それ以外はサーバーの英語メッセージを出さない", () => {
    expect(toPhoneRegisterErrorMessage(new ApiError("db down", 500))).not.toContain("db down");
    expect(toPhoneRegisterErrorMessage(new TypeError("Failed to fetch"))).toContain("作れませんでした");
  });
});

describe("formatRemaining", () => {
  it.each([
    [300, "5:00"],
    [245, "4:05"],
    [9, "0:09"],
    [0, "0:00"],
    [-3, "0:00"],
  ])("%i 秒 → %s", (s, want) => {
    expect(formatRemaining(s)).toBe(want);
  });
});

describe("toPhoneRegisterErrorMessage（利用停止）", () => {
  it("403 は「利用を再開」の案内", () => {
    expect(toPhoneRegisterErrorMessage(new ApiError("user stopped", 403))).toContain("利用を再開");
  });
});
