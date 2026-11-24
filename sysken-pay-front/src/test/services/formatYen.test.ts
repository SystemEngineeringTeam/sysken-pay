import { describe, expect, it } from "vitest";
import { formatYen } from "../../services/formatYen";

describe("formatYen", () => {
  it("3桁ごとに区切る", () => {
    expect(formatYen(1230)).toBe("¥1,230");
    expect(formatYen(0)).toBe("¥0");
  });
});
