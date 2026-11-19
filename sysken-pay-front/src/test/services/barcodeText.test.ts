import { describe, it, expect } from "vitest";
import { toHalfWidth } from "../../services/barcodeText";

describe("toHalfWidth", () => {
  it("全角の英数字を半角にする", () => {
    expect(toHalfWidth("ＳＰ７Ｑ２Ｋ")).toBe("SP7Q2K");
    expect(toHalfWidth("4901330502881")).toBe("4901330502881");
  });
});
