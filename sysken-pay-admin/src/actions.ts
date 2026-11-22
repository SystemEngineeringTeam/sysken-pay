// お金・利用状態を変える操作。順序（返金→停止）をここで決めて、テストで確かめる。
import type { Api } from "./api";

export type StopResult = { refunded: number; remaining: number };

/**
 * 利用停止する。withRefund なら先に返金する。
 * 返金が失敗したら停止しない（残高を残したまま止めてしまわないように、例外をそのまま投げる）。
 */
export const stopMember = async (api: Pick<Api, "refund" | "stop">, userId: string, withRefund: boolean): Promise<StopResult> => {
  const refunded = withRefund ? await api.refund(userId) : 0;
  const remaining = await api.stop(userId);
  return { refunded, remaining };
};

export type BatchStopResult = { stopped: string[]; failed: string[] };

/** 卒業候補など、複数人を1人ずつ利用停止する（返金はしない）。失敗した人は failed に残す */
export const stopMembers = async (api: Pick<Api, "stop">, userIds: string[]): Promise<BatchStopResult> => {
  const stopped: string[] = [];
  const failed: string[] = [];
  for (const id of userIds) {
    try {
      await api.stop(id);
      stopped.push(id);
    } catch {
      failed.push(id);
    }
  }
  return { stopped, failed };
};
