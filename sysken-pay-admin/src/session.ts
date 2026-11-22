// ログイン状態（管理者パスワード）を、このタブの sessionStorage に置く。
// リロードしてもログインしたままにするため。タブ・ブラウザを閉じると消える（localStorage には置かない）。
// URL には入れない。
const KEY = "sysken-pay-admin:session";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const defaultStore = (): Store | null => {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
};

export const saveSession = (password: string, store: Store | null = defaultStore()): void => {
  try {
    store?.setItem(KEY, password);
  } catch {
    // 保存できなくても、このページを開いている間は使える
  }
};

export const loadSession = (store: Store | null = defaultStore()): string | null => {
  try {
    const v = store?.getItem(KEY) ?? null;
    return v === "" ? null : v;
  } catch {
    return null;
  }
};

export const clearSession = (store: Store | null = defaultStore()): void => {
  try {
    store?.removeItem(KEY);
  } catch {
    // 消せなくても、ログアウト自体は進める
  }
};
