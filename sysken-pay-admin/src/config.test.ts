import { describe, expect, it } from "vitest";
import { API_TARGETS, DEFAULT_API_BASE, DEFAULT_TARGET, baseOf, loadTarget, parseTargetId, saveTarget } from "./config";

describe("通信先", () => {
  it("既定は sysken-pay.local:8080（ポートが要る）", () => {
    expect(DEFAULT_TARGET).toBe("lan");
    expect(DEFAULT_API_BASE).toBe("http://sysken-pay.local:8080");
  });
  it("ローカルは localhost:8080", () => expect(baseOf("local")).toBe("http://localhost:8080"));
  it("id を重複させない", () => expect(new Set(API_TARGETS.map((t) => t.id)).size).toBe(API_TARGETS.length));
  it("知らない id は null", () => {
    expect(parseTargetId("local")).toBe("local");
    expect(parseTargetId("http://evil.example")).toBeNull();
    expect(parseTargetId(null)).toBeNull();
  });
});

describe("loadTarget / saveTarget", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  it("保存がなければ既定、保存したら読める", () => {
    const s = mem();
    expect(loadTarget(s)).toBe("lan");
    saveTarget("local", s);
    expect(loadTarget(s)).toBe("local");
  });
  it("壊れた保存値・読み出しの失敗は既定に戻す", () => {
    expect(loadTarget({ getItem: () => "junk" })).toBe("lan");
    expect(loadTarget({ getItem: () => { throw new Error("denied"); } })).toBe("lan");
  });
});

describe("entraConfigured", () => {
  it("テナントとクライアント ID が両方あるときだけ true", async () => {
    const { entraConfigured } = await import("./config");
    expect(entraConfigured({ tenantId: "t", clientId: "c" })).toBe(true);
    expect(entraConfigured({ tenantId: "", clientId: "c" })).toBe(false);
    expect(entraConfigured({ tenantId: "t", clientId: "" })).toBe(false);
  });
});
