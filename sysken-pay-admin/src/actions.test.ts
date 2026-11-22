import { describe, expect, it, vi } from "vitest";
import { stopMember, stopMembers } from "./actions";

describe("stopMember", () => {
  it("返金して止める：返金→停止の順で、返した額と残りを返す", async () => {
    const order: string[] = [];
    const api = {
      refund: vi.fn(async () => (order.push("refund"), 300)),
      stop: vi.fn(async () => (order.push("stop"), 0)),
    };
    expect(await stopMember(api, "24K00001", true)).toEqual({ refunded: 300, remaining: 0 });
    expect(order).toEqual(["refund", "stop"]);
  });
  it("止めるだけ：返金は呼ばない。残高は残る", async () => {
    const api = { refund: vi.fn(), stop: vi.fn(async () => 300) };
    expect(await stopMember(api, "24K00001", false)).toEqual({ refunded: 0, remaining: 300 });
    expect(api.refund).not.toHaveBeenCalled();
  });
  it("返金が失敗したら停止しない", async () => {
    const api = { refund: vi.fn().mockRejectedValue(new Error("x")), stop: vi.fn() };
    await expect(stopMember(api, "24K00001", true)).rejects.toThrow("x");
    expect(api.stop).not.toHaveBeenCalled();
  });
});

describe("stopMembers", () => {
  it("1人失敗しても残りは続け、失敗した人を返す", async () => {
    const api = { stop: vi.fn(async (id: string) => { if (id === "b") throw new Error("x"); return 0; }) };
    expect(await stopMembers(api, ["a", "b", "c"])).toEqual({ stopped: ["a", "c"], failed: ["b"] });
  });
});
