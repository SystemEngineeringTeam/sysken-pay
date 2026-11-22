// バックエンド（内部アドレス）の API を呼ぶ。fetch は差し替えられるようにして、テストできるようにする。
import { ADMIN_USER, DEFAULT_API_BASE } from "./config";
import type { Item } from "./form";

export type ApiErrorKind = "unauthorized" | "network" | "request" | "server";

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
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

export const createApi = (password: string, fetchFn: Fetch = (...a) => fetch(...a), base: string = DEFAULT_API_BASE) => {
  const auth = basicAuth(ADMIN_USER, password);

  const call = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = { Authorization: auth };
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    let res: Response;
    try {
      res = await fetchFn(`${base}${path}`, { ...init, headers });
    } catch {
      throw new ApiError("network", "ラズパイにつながりません。部室のネットワークにいるか確かめてください。");
    }
    if (res.status === 401) throw new ApiError("unauthorized", "パスワードが違います。");
    return res;
  };

  const failIfNotOk = async (res: Response, okStatuses: number[]): Promise<void> => {
    if (okStatuses.includes(res.status)) return;
    throw new ApiError(res.status >= 500 ? "server" : "request", await errorMessage(res));
  };

  return {
    /** パスワードが正しいか。違えば ApiError("unauthorized") */
    async verify(): Promise<void> {
      await failIfNotOk(await call("/v1/admin/verify"), [204]);
    },

    /** JAN の商品。登録されていなければ null */
    async getItem(jan: string): Promise<Item | null> {
      const res = await call(`/v1/item/${encodeURIComponent(jan)}`);
      if (res.status === 404) return null;
      await failIfNotOk(res, [200]);
      const b = (await res.json()) as Item & { price: number };
      return { jan_code: b.jan_code, item_name: b.item_name, price: b.price };
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
