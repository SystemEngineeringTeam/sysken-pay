import { describe, expect, it } from "vitest";
import { ApiError } from "../../adapter/api/ApiError";
import { toMemberErrorMessage } from "../../services/memberErrorMessage";

describe("toMemberErrorMessage", () => {
  it("409 は操作ごとに理由を出す", () => {
    expect(toMemberErrorMessage("refund", new ApiError("x", 409))).toContain("0 円");
    expect(toMemberErrorMessage("stop", new ApiError("x", 409))).toContain("すでに利用停止");
    expect(toMemberErrorMessage("resume", new ApiError("x", 409))).toContain("利用停止していません");
  });

  it("401・404", () => {
    expect(toMemberErrorMessage("list", new ApiError("x", 401))).toContain("管理者パスワード");
    expect(toMemberErrorMessage("stop", new ApiError("x", 404))).toContain("登録されていません");
  });

  it("それ以外は操作ごとの決まった文", () => {
    expect(toMemberErrorMessage("refund", new Error("x"))).toBe("返金できませんでした。もう一度お試しください。");
  });
});
