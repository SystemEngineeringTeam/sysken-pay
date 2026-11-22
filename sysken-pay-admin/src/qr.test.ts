import { describe, expect, it } from "vitest";
import { buildQrUrl, formatRemaining, QR_DISPLAY_SECONDS } from "./qr";

describe("qr", () => {
  it("HRI はフラグメントに入れる（サーバーに送られない）", () => {
    expect(buildQrUrl("https://qr.pay.sysken.net", "SP7Q2K")).toBe("https://qr.pay.sysken.net/#a=SP7Q2K");
    expect(buildQrUrl("https://qr.pay.sysken.net/#", "SP7Q2K")).toBe("https://qr.pay.sysken.net/#a=SP7Q2K");
    expect(buildQrUrl("https://qr.pay.sysken.net", "SP7Q2K")).not.toContain("?");
  });
  it("表示は 2 分", () => expect(QR_DISPLAY_SECONDS).toBe(120));
  it("残り時間", () => {
    expect(formatRemaining(120)).toBe("2:00");
    expect(formatRemaining(65)).toBe("1:05");
    expect(formatRemaining(-3)).toBe("0:00");
  });
});
