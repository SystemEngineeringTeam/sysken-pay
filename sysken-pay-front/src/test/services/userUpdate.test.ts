import { describe, expect, it } from "vitest";
import { ApiError } from "../../adapter/api/ApiError";
import { isValidStudentId, toUserUpdateErrorMessage } from "../../services/userUpdate";

describe("isValidStudentId", () => {
  it("学籍番号の形だけ true", () => {
    expect(isValidStudentId("24K01234")).toBe(true);
    expect(isValidStudentId(" 24k01234 ")).toBe(true);
    expect(isValidStudentId("K2401234")).toBe(false);
    expect(isValidStudentId("24K")).toBe(false);
    expect(isValidStudentId("24K" + "1".repeat(20))).toBe(false);
  });
});

describe("toUserUpdateErrorMessage", () => {
  it("409 は学籍番号が使われている", () => {
    expect(toUserUpdateErrorMessage(new ApiError("user already exists", 409))).toContain("もう別のユーザー");
  });
  it("それ以外はサーバーの英語を出さない", () => {
    expect(toUserUpdateErrorMessage(new Error("sql error"))).toBe("更新に失敗しました。もう一度お試しください。");
  });
});
