import { describe, it, expect } from "vitest";
import { buildQrUrl, normalizeQrEndpoint } from "../../services/qrUrl";

describe("normalizeQrEndpoint", () => {
  it("スキームが無ければ https を付ける", () => {
    expect(normalizeQrEndpoint("qr.pay.sysken.net")).toBe("https://qr.pay.sysken.net");
  });
  it("末尾の / と # を取り除く", () => {
    expect(normalizeQrEndpoint("https://qr.pay.sysken.net/")).toBe("https://qr.pay.sysken.net");
    expect(normalizeQrEndpoint(" qr.pay.sysken.net/# ")).toBe("https://qr.pay.sysken.net");
  });
  it("http で指定されたらそのまま使う", () => {
    expect(normalizeQrEndpoint("http://localhost:5173")).toBe("http://localhost:5173");
  });
  it("未設定・空なら null", () => {
    expect(normalizeQrEndpoint(undefined)).toBeNull();
    expect(normalizeQrEndpoint("")).toBeNull();
    expect(normalizeQrEndpoint("  ")).toBeNull();
  });
});

describe("buildQrUrl", () => {
  it("支払い用文字列をフラグメント（#a=）に入れる。クエリには入れない", () => {
    const url = buildQrUrl("https://qr.pay.sysken.net", "SP7Q2KX9MDRA4TW8YZ");
    expect(url).toBe("https://qr.pay.sysken.net/#a=SP7Q2KX9MDRA4TW8YZ");
    expect(url).not.toContain("?");
  });
});
