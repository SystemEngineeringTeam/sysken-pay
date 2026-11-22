// Entra ID ログイン（MSAL・リダイレクト方式）。トークンは MSAL に任せ、自分では保存しない
// （MSAL の保存先は sessionStorage。localStorage には置かない）。
// MSAL は薄い口（EntraClient）の向こうに置き、テストでは差し替える。
import type { AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { ENTRA } from "./config";

export type EntraClient = {
  handleRedirectPromise(): Promise<AuthenticationResult | null>;
  getAllAccounts(): AccountInfo[];
  setActiveAccount(account: AccountInfo | null): void;
  loginRedirect(req: { scopes: string[] }): Promise<void>;
  logoutRedirect(req?: { account?: AccountInfo }): Promise<void>;
  acquireTokenSilent(req: { scopes: string[]; account: AccountInfo }): Promise<AuthenticationResult>;
  acquireTokenPopup(req: { scopes: string[]; account: AccountInfo }): Promise<AuthenticationResult>;
};

export const SCOPES = ["openid", "profile"];
/** プロフィール画像（/me/photo）を読むためのスコープ。管理者の同意なしで使える既定のもの */
export const GRAPH_SCOPES = ["User.Read"];

/**
 * 学籍番号から氏名を引くためのスコープ（他の人の基本情報）。ログイン時には求めない。
 * 管理者の同意が要る場合は取れないので、名前を手で入れてもらう（画面側で続けられる）。
 */
export const LOOKUP_SCOPES = ["User.ReadBasic.All"];

export class EntraLoginRequired extends Error {}

export const createEntra = (client: EntraClient) => {
  let account: AccountInfo | null = null;

  return {
    /** ページを開いたときに呼ぶ。リダイレクトから戻ってきた直後か、すでにサインイン済みならアカウントを返す */
    async init(): Promise<AccountInfo | null> {
      const result = await client.handleRedirectPromise();
      account = result?.account ?? client.getAllAccounts()[0] ?? null;
      client.setActiveAccount(account);
      return account;
    },

    get account(): AccountInfo | null {
      return account;
    },

    /** Microsoft のサインイン画面へ移る（戻ってきたら init で拾う） */
    async login(): Promise<void> {
      await client.loginRedirect({ scopes: [...SCOPES, ...GRAPH_SCOPES] });
    },

    async logout(): Promise<void> {
      const a = account;
      account = null;
      await client.logoutRedirect(a ? { account: a } : undefined);
    },

    /** API に送る ID トークン。切れていれば更新し、更新できなければ EntraLoginRequired */
    async getIdToken(): Promise<string> {
      if (!account) throw new EntraLoginRequired();
      try {
        const r = await client.acquireTokenSilent({ scopes: SCOPES, account });
        if (!r.idToken) throw new EntraLoginRequired();
        return r.idToken;
      } catch (e) {
        throw e instanceof EntraLoginRequired ? e : new EntraLoginRequired();
      }
    },

    /**
     * Graph に送るアクセストークン（既定は画像用）。取れなければ null（その機能なしで続ける）。
     * 同意がまだで silent では取れないとき、interactive: true ならポップアップで同意を求める
     * （ボタンを押した直後だけ使う。管理者の同意が要る場合はここでも取れず null）。
     */
    async getGraphToken(scopes: string[] = GRAPH_SCOPES, opts: { interactive?: boolean } = {}): Promise<string | null> {
      if (!account) return null;
      try {
        const r = await client.acquireTokenSilent({ scopes, account });
        return r.accessToken || null;
      } catch {
        if (!opts.interactive) return null;
      }
      try {
        const r = await client.acquireTokenPopup({ scopes, account });
        return r.accessToken || null;
      } catch {
        return null;
      }
    },
  };
};

export type Entra = ReturnType<typeof createEntra>;

/** 本物の MSAL につなぐ（ブラウザだけで使う。設定が空なら null） */
export const createBrowserEntra = async (cfg = ENTRA): Promise<Entra | null> => {
  if (cfg.tenantId === "" || cfg.clientId === "") return null;
  const { createStandardPublicClientApplication } = await import("@azure/msal-browser");
  const pca = await createStandardPublicClientApplication({
    auth: {
      clientId: cfg.clientId,
      authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
      redirectUri: location.origin + location.pathname,
    },
    cache: { cacheLocation: "sessionStorage" },
  });
  return createEntra(pca);
};
