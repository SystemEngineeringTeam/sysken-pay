// バックエンド（内部アドレス）の API を呼ぶ。fetch は差し替えられるようにして、テストできるようにする。
import { ADMIN_USER, DEFAULT_API_BASE } from "./config";
import type { Item } from "./form";
import type { Member } from "./members";

export type ListedItem = { item_id: number; jan_code: string; item_name: string; price: number; disabled: boolean };

/** JAN で引いた商品。disabled が true なら無効（買えない） */
export type FoundItem = Item & { disabled: boolean };

export type ApiErrorKind = "unauthorized" | "forbidden" | "network" | "request" | "server";

/** 管理者の許可リストの 1 人 */
export type AllowedAdmin = { upn: string; student_id: string | null; added_by: string; created_at: string };

/** 認証の方法。文字列なら管理者パスワード（BASIC）、関数なら ID トークンを返すもの（Bearer） */
export type Credentials = string | (() => Promise<string>);

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    /** HTTP ステータス（通信できなかったときは 0）。画面で文言を出し分けるのに使う */
    readonly status: number = 0,
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

// BASIC 認証の値。パスワードに日本語が入っても壊れないよう、UTF-8 にしてから base64 にする
export const basicAuth = (user: string, password: string): string => {
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
};

const errorMessage = async (res: Response): Promise<string> => {
  try {
    const body = (await res.json()) as { message?: unknown };
    if (typeof body.message === "string" && body.message !== "") return body.message;
  } catch {
    // 本文が JSON でなければ、下の既定の文言にする
  }
  return `エラーが返りました（${res.status}）。`;
};

export const createApi = (credentials: Credentials, fetchFn: Fetch = (...a) => fetch(...a), base: string = DEFAULT_API_BASE) => {
  const bearer = typeof credentials === "function";
  const authHeader = async (): Promise<string> => {
    if (!bearer) return basicAuth(ADMIN_USER, credentials);
    try {
      return `Bearer ${await credentials()}`;
    } catch {
      throw new ApiError("unauthorized", "Microsoft のログインが切れました。ログインし直してください。");
    }
  };

  const call = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = { Authorization: await authHeader() };
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    let res: Response;
    try {
      res = await fetchFn(`${base}${path}`, { ...init, headers });
    } catch {
      throw new ApiError("network", "ラズパイにつながりません。部室のネットワークにいるか確かめてください。");
    }
    if (res.status === 401) {
      throw new ApiError("unauthorized", bearer ? "Microsoft のログインが切れました。ログインし直してください。" : "パスワードが違います。");
    }
    return res;
  };

  const failIfNotOk = async (res: Response, okStatuses: number[]): Promise<void> => {
    if (okStatuses.includes(res.status)) return;
    throw new ApiError(res.status >= 500 ? "server" : "request", await errorMessage(res), res.status);
  };

  const post = async (path: string, okStatus = 200): Promise<unknown> => {
    const res = await call(path, { method: "POST" });
    await failIfNotOk(res, [okStatus]);
    return res.json();
  };

  return {
    /** ログインできるか。違えば ApiError("unauthorized")。Microsoft で入れても許可リストにいなければ "forbidden" */
    async verify(): Promise<void> {
      const res = await call("/v1/admin/verify");
      if (bearer && res.status === 403) throw new ApiError("forbidden", "この Microsoft アカウントは、管理者として許可されていません。", 403);
      await failIfNotOk(res, [204]);
    },

    /** 管理者の許可リストと、いまログインしている人（パスワードなら null） */
    async listAdmins(): Promise<{ admins: AllowedAdmin[]; current: string | null }> {
      const res = await call("/v1/admin/allowlist");
      await failIfNotOk(res, [200]);
      const b = (await res.json()) as { admins?: AllowedAdmin[]; current?: string | null };
      return { admins: b.admins ?? [], current: b.current || null };
    },

    /** UPN を許可リストに足す */
    async addAdmin(upn: string): Promise<void> {
      await failIfNotOk(await call("/v1/admin/allowlist", { method: "POST", body: JSON.stringify({ upn }) }), [201]);
    },

    /** UPN を許可リストから外す */
    async removeAdmin(upn: string): Promise<void> {
      await failIfNotOk(await call(`/v1/admin/allowlist/${encodeURIComponent(upn)}`, { method: "DELETE" }), [200]);
    },

    /** JAN の商品（無効のものも返す）。登録されていなければ null */
    async getItem(jan: string): Promise<FoundItem | null> {
      const res = await call(`/v1/item/${encodeURIComponent(jan)}`);
      if (res.status === 404) return null;
      await failIfNotOk(res, [200]);
      const b = (await res.json()) as Item & { disabled?: boolean };
      return { jan_code: b.jan_code, item_name: b.item_name, price: b.price, disabled: b.disabled === true };
    },

    /** 商品の全件（無効のものも含む） */
    async listItems(): Promise<ListedItem[]> {
      const res = await call("/v1/item?include_disabled=true");
      await failIfNotOk(res, [200]);
      const b = (await res.json()) as { items?: ListedItem[] };
      return b.items ?? [];
    },

    /** 全員（止めた人も含む）を、残高・状態つきで */
    async listUsers(): Promise<Member[]> {
      const res = await call("/v1/user");
      await failIfNotOk(res, [200]);
      const b = (await res.json()) as { users?: Member[] };
      return b.users ?? [];
    },

    /** 残高ちょうどを返金する。返した額を返す */
    async refund(userId: string): Promise<number> {
      const b = (await post(`/v1/user/${encodeURIComponent(userId)}/refund`)) as { refunded_amount: number };
      return b.refunded_amount;
    },

    /** 利用停止にする。残っている残高を返す */
    async stop(userId: string): Promise<number> {
      const b = (await post(`/v1/user/${encodeURIComponent(userId)}/stop`)) as { balance: number };
      return b.balance;
    },

    async resume(userId: string): Promise<void> {
      await post(`/v1/user/${encodeURIComponent(userId)}/resume`);
    },

    /** 停止中で残高 0 の人を、一覧から非表示にする（記録は消えない） */
    async hide(userId: string): Promise<void> {
      await post(`/v1/user/${encodeURIComponent(userId)}/hide`);
    },

    /** 非表示をやめて、停止中の一覧に戻す */
    async unhide(userId: string): Promise<void> {
      await post(`/v1/user/${encodeURIComponent(userId)}/unhide`);
    },

    /** 記録が1件もない停止中の人を消す（取り消せない） */
    async remove(userId: string): Promise<void> {
      const res = await call(`/v1/user/${encodeURIComponent(userId)}`, { method: "DELETE" });
      await failIfNotOk(res, [200]);
    },

    /** 名前（と、変えるときだけ学籍番号）を更新する。更新後の学籍番号と名前を返す */
    async updateUser(userId: string, body: { user_name: string; user_id?: string }): Promise<{ user_id: string; user_name: string }> {
      const res = await call(`/v1/user/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify(body) });
      await failIfNotOk(res, [200]);
      const b = (await res.json()) as { user_id?: string; user_name?: string };
      return { user_id: b.user_id ?? body.user_id ?? userId, user_name: b.user_name ?? body.user_name };
    },

    /** 支払い用バーコード（HRI）を発行する。古いものは使えなくなる。hri はこのときにしか取り出せない */
    async issueHri(userId: string): Promise<{ hri: string; user_name: string }> {
      const b = (await post(`/v1/user/${encodeURIComponent(userId)}/hri`, 201)) as { hri: string; user_name: string };
      return { hri: b.hri, user_name: b.user_name };
    },

    /** 商品を無効にする（買えなくなる。消さないので、有効に戻せる） */
    async disableItem(jan: string): Promise<void> {
      await post(`/v1/item/${encodeURIComponent(jan)}/disable`);
    },

    /** 無効の商品を有効に戻す */
    async enableItem(jan: string): Promise<void> {
      await post(`/v1/item/${encodeURIComponent(jan)}/enable`);
    },

    async register(item: Item): Promise<void> {
      await failIfNotOk(await call("/v1/item", { method: "POST", body: JSON.stringify(item) }), [201]);
    },

    async update(item: Item): Promise<void> {
      await failIfNotOk(await call("/v1/item", { method: "PATCH", body: JSON.stringify(item) }), [200]);
    },
  };
};

export type Api = ReturnType<typeof createApi>;
