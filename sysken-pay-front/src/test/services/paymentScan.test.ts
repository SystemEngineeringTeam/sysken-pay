import { describe, it, expect } from "vitest";
import { ApiError } from "../../adapter/api/ApiError";
import { isStudentId, looksLikePaymentCode, toPaymentScanErrorMessage } from "../../services/paymentScan";

describe("isStudentId", () => {
  it("学籍番号の形だけ true", () => {
    expect(isStudentId("24K01234")).toBe(true);
    expect(isStudentId(" 24k01234 ")).toBe(true);
    expect(isStudentId("SP7Q2KX9MDRA4TW8YZ")).toBe(false);
    expect(isStudentId("4901330502881")).toBe(false);
  });
});

describe("looksLikePaymentCode", () => {
  it("SP から始まる18文字（空白・ハイフン・小文字は無視）", () => {
    expect(looksLikePaymentCode("SP7Q2KX9MDRA4TW8YZ")).toBe(true);
    expect(looksLikePaymentCode("sp 7q2k-x9md ra4t w8yz")).toBe(true);
    expect(looksLikePaymentCode("SP123")).toBe(false);
    expect(looksLikePaymentCode("4901330502881")).toBe(false);
  });
});

describe("toPaymentScanErrorMessage", () => {
  it("ステータスごとに理由を出す", () => {
    expect(toPaymentScanErrorMessage(new ApiError("x", 400))).toContain("読み取れませんでした");
    expect(toPaymentScanErrorMessage(new ApiError("x", 403))).toBe("利用停止されています。役員に伝えてください。");
    expect(toPaymentScanErrorMessage(new ApiError("x", 404))).toContain("使えないバーコード");
    expect(toPaymentScanErrorMessage(new ApiError("x", 429))).toContain("1分ほど");
  });

  it("それ以外はサーバーの英語メッセージをそのまま出さない", () => {
    expect(toPaymentScanErrorMessage(new ApiError("sql: connection refused", 500))).not.toContain("sql");
    expect(toPaymentScanErrorMessage(new TypeError("Failed to fetch"))).toContain("確かめられませんでした");
  });
});
