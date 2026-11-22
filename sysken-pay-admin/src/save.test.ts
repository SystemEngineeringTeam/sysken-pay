import { describe, expect, it, vi } from "vitest";
import { saveItem, singleFlight } from "./save";

const item = { jan_code: "4901777018884", item_name: "お茶", price: 150 };
const fakeApi = (existing: typeof item | null) => ({
  getItem: vi.fn().mockResolvedValue(existing),
  register: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
});

describe("saveItem", () => {
  it("未登録なら新規登録する", async () => {
    const api = fakeApi(null);
    expect(await saveItem(api, item)).toBe("created");
    expect(api.register).toHaveBeenCalledWith(item);
    expect(api.update).not.toHaveBeenCalled();
  });
  it("登録済みなら更新する（登録は呼ばない）", async () => {
    const api = fakeApi({ ...item, price: 100 });
    expect(await saveItem(api, item)).toBe("updated");
    expect(api.update).toHaveBeenCalledWith(item);
    expect(api.register).not.toHaveBeenCalled();
  });
  it("途中で失敗したら、そのまま例外にする", async () => {
    const api = fakeApi(null);
    api.register.mockRejectedValue(new Error("boom"));
    await expect(saveItem(api, item)).rejects.toThrow("boom");
  });
});

describe("singleFlight", () => {
  it("実行中の再呼び出しでは、中身を1回しか実行しない", async () => {
    let release!: () => void;
    const fn = vi.fn(() => new Promise<string>((r) => (release = () => r("ok"))));
    const run = singleFlight(fn);
    const a = run();
    const b = run();
    release();
    expect(await a).toBe("ok");
    expect(await b).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("終わったあと（失敗でも）は、もう一度実行できる", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce("ok");
    const run = singleFlight(fn);
    await expect(run()).rejects.toThrow("x");
    expect(await run()).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
