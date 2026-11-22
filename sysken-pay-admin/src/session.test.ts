import { describe, expect, it } from "vitest";
import { clearSession, loadSession, saveSession } from "./session";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe("session", () => {
  it("保存したパスワードを読み出せる。消すと無くなる", () => {
    const s = memory();
    expect(loadSession(s)).toBeNull();
    saveSession("pw あ", s);
    expect(loadSession(s)).toBe("pw あ");
    clearSession(s);
    expect(loadSession(s)).toBeNull();
  });
  it("保存先が使えなくても、例外を出さない", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(() => saveSession("pw", broken)).not.toThrow();
    expect(loadSession(broken)).toBeNull();
    expect(() => clearSession(broken)).not.toThrow();
    expect(loadSession(null)).toBeNull();
  });
});
