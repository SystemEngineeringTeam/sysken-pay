import { describe, it, expect } from "vitest";
import { CHARGE_AMOUNTS, chargeAmountsLabel, isChargeAmount } from "../../services/chargeAmounts";

describe("chargeAmounts", () => {
  it("チャージできるのは 500 / 1000 / 2000 円（バックエンドと同じ）", () => {
    expect([...CHARGE_AMOUNTS]).toEqual([500, 1000, 2000]);
  });

  it("それ以外の金額は受け付けない", () => {
    expect(isChargeAmount(500)).toBe(true);
    expect(isChargeAmount(2000)).toBe(true);
    expect(isChargeAmount(100)).toBe(false);
    expect(isChargeAmount(300)).toBe(false);
    expect(isChargeAmount(0)).toBe(false);
  });

  it("画面用の文", () => {
    expect(chargeAmountsLabel).toBe("500円・1,000円・2,000円");
  });
});
