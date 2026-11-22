// 商品を保存する。JAN が登録済みなら更新、なければ新規登録にする。
import type { Api } from "./api";
import type { Item } from "./form";

export type SaveResult = "created" | "updated";

export const saveItem = async (api: Pick<Api, "getItem" | "register" | "update">, item: Item): Promise<SaveResult> => {
  const existing = await api.getItem(item.jan_code);
  if (existing) {
    await api.update(item);
    return "updated";
  }
  await api.register(item);
  return "created";
};

// 実行中にもう一度呼ばれたら、新しく始めずに実行中の結果を返す（ボタンの連打・二重送信の防止）
export const singleFlight = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => {
  let running: Promise<R> | null = null;
  return (...args: A): Promise<R> => {
    if (running) return running;
    running = fn(...args).finally(() => {
      running = null;
    });
    return running;
  };
};
