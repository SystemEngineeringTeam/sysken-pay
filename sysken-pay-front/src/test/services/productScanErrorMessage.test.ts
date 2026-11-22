import { describe, it, expect } from "vitest";
import { ApiError } from "../../adapter/api/ApiError";
import { PRODUCT_DISABLED, PRODUCT_NOT_REGISTERED, toProductScanErrorMessage } from "../../services/productScanErrorMessage";

describe("toProductScanErrorMessage", () => {
  it("404 は未登録の商品", () => {
    expect(toProductScanErrorMessage(new ApiError("item not found", 404))).toBe(PRODUCT_NOT_REGISTERED);
  });

  it("400 は読み取りミス", () => {
    expect(toProductScanErrorMessage(new ApiError("invalid janCode", 400))).toBe(
      "商品のバーコードを読み取れませんでした。もう一度かざしてください。"
    );
  });

  it("それ以外はサーバーの英語メッセージをそのまま出さない", () => {
    expect(toProductScanErrorMessage(new ApiError("sql: connection refused", 500))).toBe(
      "商品の取得に失敗しました。もう一度かざしてください。"
    );
    expect(toProductScanErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "商品の取得に失敗しました。もう一度かざしてください。"
    );
  });

  it("無効の案内は、未登録の案内と文言が違う", () => {
    expect(PRODUCT_DISABLED).not.toBe(PRODUCT_NOT_REGISTERED);
    expect(PRODUCT_DISABLED).toContain("無効");
  });
});
