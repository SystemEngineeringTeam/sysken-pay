import type { AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { describe, expect, it, vi } from "vitest";
import { createEntra, EntraLoginRequired, LOOKUP_SCOPES, type EntraClient } from "./entra";

const acct = { username: "x24042xx@aitech.ac.jp" } as AccountInfo;

const fake = (over: Partial<EntraClient> = {}): EntraClient => ({
  handleRedirectPromise: vi.fn().mockResolvedValue(null),
  getAllAccounts: vi.fn().mockReturnValue([]),
  setActiveAccount: vi.fn(),
  loginRedirect: vi.fn().mockResolvedValue(undefined),
  logoutRedirect: vi.fn().mockResolvedValue(undefined),
  acquireTokenSilent: vi.fn().mockResolvedValue({ idToken: "tok" } as AuthenticationResult),
  acquireTokenPopup: vi.fn().mockRejectedValue(new Error("popup")),
  ...over,
});

describe("createEntra", () => {
  it("init: リダイレクトから戻ったらそのアカウント、なければ保存済み、なければ null", async () => {
    expect(await createEntra(fake({ handleRedirectPromise: vi.fn().mockResolvedValue({ account: acct }) })).init()).toBe(acct);
    expect(await createEntra(fake({ getAllAccounts: vi.fn().mockReturnValue([acct]) })).init()).toBe(acct);
    expect(await createEntra(fake()).init()).toBeNull();
  });

  it("getIdToken: ログイン前は EntraLoginRequired", async () => {
    await expect(createEntra(fake()).getIdToken()).rejects.toBeInstanceOf(EntraLoginRequired);
  });

  it("getIdToken: ID トークンを返す", async () => {
    const c = fake({ getAllAccounts: vi.fn().mockReturnValue([acct]) });
    const e = createEntra(c);
    await e.init();
    expect(await e.getIdToken()).toBe("tok");
    expect(c.acquireTokenSilent).toHaveBeenCalledWith({ scopes: ["openid", "profile"], account: acct });
  });

  it("getIdToken: 更新に失敗・ID トークンなしは EntraLoginRequired", async () => {
    for (const acquire of [vi.fn().mockRejectedValue(new Error("interaction_required")), vi.fn().mockResolvedValue({ idToken: "" })]) {
      const e = createEntra(fake({ getAllAccounts: vi.fn().mockReturnValue([acct]), acquireTokenSilent: acquire }));
      await e.init();
      await expect(e.getIdToken()).rejects.toBeInstanceOf(EntraLoginRequired);
    }
  });

  it("login / logout", async () => {
    const c = fake({ getAllAccounts: vi.fn().mockReturnValue([acct]) });
    const e = createEntra(c);
    await e.init();
    await e.login();
    expect(c.loginRedirect).toHaveBeenCalledWith({ scopes: ["openid", "profile", "User.Read"] });
    await e.logout();
    expect(c.logoutRedirect).toHaveBeenCalledWith({ account: acct });
    expect(e.account).toBeNull();
  });

  it("getGraphToken: アクセストークンを返す。取れなければ null", async () => {
    const ok = createEntra(fake({ getAllAccounts: vi.fn().mockReturnValue([acct]), acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: "g" }) }));
    await ok.init();
    expect(await ok.getGraphToken()).toBe("g");
    const ng = createEntra(fake({ getAllAccounts: vi.fn().mockReturnValue([acct]), acquireTokenSilent: vi.fn().mockRejectedValue(new Error("x")) }));
    await ng.init();
    expect(await ng.getGraphToken()).toBeNull();
    expect(await createEntra(fake()).getGraphToken()).toBeNull();
  });

  it("getGraphToken: スコープを渡せる（氏名の検索用）", async () => {
    const silent = vi.fn().mockResolvedValue({ accessToken: "g" });
    const e = createEntra(fake({ getAllAccounts: vi.fn().mockReturnValue([acct]), acquireTokenSilent: silent }));
    await e.init();
    await e.getGraphToken(LOOKUP_SCOPES);
    expect(silent).toHaveBeenCalledWith({ scopes: ["User.ReadBasic.All"], account: acct });
  });

  it("getGraphToken: silent で取れなければ、interactive のときだけポップアップで同意を求める", async () => {
    const silent = vi.fn().mockRejectedValue(new Error("consent_required"));
    const popup = vi.fn().mockResolvedValue({ accessToken: "p" });
    const e = createEntra(fake({ getAllAccounts: vi.fn().mockReturnValue([acct]), acquireTokenSilent: silent, acquireTokenPopup: popup }));
    await e.init();
    expect(await e.getGraphToken(LOOKUP_SCOPES)).toBeNull();
    expect(popup).not.toHaveBeenCalled();
    expect(await e.getGraphToken(LOOKUP_SCOPES, { interactive: true })).toBe("p");
    expect(popup).toHaveBeenCalledWith({ scopes: ["User.ReadBasic.All"], account: acct });
  });
  it("getGraphToken: ポップアップで断られたら（管理者の同意が要る等）null", async () => {
    const e = createEntra(fake({ getAllAccounts: vi.fn().mockReturnValue([acct]), acquireTokenSilent: vi.fn().mockRejectedValue(new Error("x")), acquireTokenPopup: vi.fn().mockRejectedValue(new Error("denied")) }));
    await e.init();
    expect(await e.getGraphToken(LOOKUP_SCOPES, { interactive: true })).toBeNull();
  });
});
