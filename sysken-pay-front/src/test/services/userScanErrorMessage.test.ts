import { describe, it, expect } from "vitest";
import { ApiError } from "../../adapter/api/ApiError";
import { toUserScanErrorMessage } from "../../services/userScanErrorMessage";

describe("toUserScanErrorMessage", () => {
  it("404 は未登録のバーコード", () => {
    expect(toUserScanErrorMessage(new ApiError("user not found", 404))).toBe(
      "登録されていないバーコードです。担当者にご連絡ください。"
    );
  });

  it("400 は読み取りミス", () => {
    expect(toUserScanErrorMessage(new ApiError("invalid userID", 400))).toBe(
      "シス研Payバーコードを読み取れませんでした。もう一度かざしてください。"
    );
  });

  it("それ以外はサーバーの英語メッセージをそのまま出さない", () => {
    expect(toUserScanErrorMessage(new ApiError("sql: connection refused", 500))).toBe("ユーザーの取得に失敗しました");
    expect(toUserScanErrorMessage(new TypeError("Failed to fetch"))).toBe("ユーザーの取得に失敗しました");
  });
});
