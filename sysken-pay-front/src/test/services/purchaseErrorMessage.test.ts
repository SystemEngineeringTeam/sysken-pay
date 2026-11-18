import { describe, it, expect } from "vitest";
import { toPurchaseErrorMessage } from "../../services/purchaseErrorMessage";

describe("toPurchaseErrorMessage", () => {
  it("残高不足", () => {
    expect(toPurchaseErrorMessage(new Error("insufficient balance"))).toBe(
      "残高が不足しています。残高を確認してください"
    );
  });

  it("商品が見つからない", () => {
    expect(toPurchaseErrorMessage(new Error("item not found"))).toBe("登録されていない商品が含まれています");
  });

  it("それ以外はサーバーの英語メッセージをそのまま出さない", () => {
    expect(toPurchaseErrorMessage(new Error("sql: connection refused"))).toBe("購入に失敗しました");
    expect(toPurchaseErrorMessage("unknown")).toBe("購入に失敗しました");
  });
});
