import type { AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { describe, expect, it, vi } from "vitest";
import { createEntra, EntraLoginRequired, type EntraClient } from "./entra";

const acct = { username: "x24042xx@aitech.ac.jp" } as AccountInfo;

const fake = (over: Partial<EntraClient> = {}): EntraClient => ({
  handleRedirectPromise: vi.fn().mockResolvedValue(null),
  getAllAccounts: vi.fn().mockReturnValue([]),
  setActiveAccount: vi.fn(),
  loginRedirect: vi.fn().mockResolvedValue(undefined),
  logoutRedirect: vi.fn().mockResolvedValue(undefined),
  acquireTokenSilent: vi.fn().mockResolvedValue({ idToken: "tok" } as AuthenticationResult),
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
});
