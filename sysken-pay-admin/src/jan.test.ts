import { describe, expect, it } from "vitest";
import { isValidJan, normalizeJan } from "./jan";

describe("isValidJan", () => {
  it("正しい EAN-13 / EAN-8 を通す", () => {
    expect(isValidJan("4901777018884")).toBe(true);
    expect(isValidJan("49123456")).toBe(true);
  });
  it("チェックデジットが違うものを断る", () => {
    expect(isValidJan("4901777018885")).toBe(false);
    expect(isValidJan("49123457")).toBe(false);
  });
  it("桁数・文字が違うものを断る", () => {
    expect(isValidJan("")).toBe(false);
    expect(isValidJan("490177701888")).toBe(false);
    expect(isValidJan("49017770188840")).toBe(false);
    expect(isValidJan("49017770188a8")).toBe(false);
  });
});

describe("normalizeJan", () => {
  it("数字以外を取り除く", () => {
    expect(normalizeJan(" 4901-7770 18884\n")).toBe("4901777018884");
  });
});
