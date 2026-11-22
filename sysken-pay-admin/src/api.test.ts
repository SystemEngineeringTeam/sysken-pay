import { describe, expect, it, vi } from "vitest";
import { ApiError, basicAuth, createApi } from "./api";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const item = { jan_code: "4901777018884", item_name: "お茶", price: 150 };

describe("basicAuth", () => {
  it("日本語のパスワードも UTF-8 で送る", () => {
    expect(basicAuth("admin", "pw")).toBe(`Basic ${btoa("admin:pw")}`);
    const v = basicAuth("admin", "あ");
    expect(atob(v.slice(6))).toBe(String.fromCharCode(...new TextEncoder().encode("admin:あ")));
  });
});

describe("createApi", () => {
  it("内部アドレスに、認証付きで送る", async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await createApi("pw", f, "https://sysken-pay.local").verify();
    expect(f).toHaveBeenCalledWith(
      "https://sysken-pay.local/v1/admin/verify",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: basicAuth("admin", "pw") }) }),
    );
  });

  it("401 は unauthorized", async () => {
    const f = vi.fn().mockResolvedValue(json(401, {}));
    await expect(createApi("bad", f).verify()).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("つながらないときは network", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(createApi("pw", f).verify()).rejects.toBeInstanceOf(ApiError);
    await expect(createApi("pw", f).verify()).rejects.toMatchObject({ kind: "network" });
  });

  it("getItem: 404 は null、200 は商品", async () => {
    expect(await createApi("pw", vi.fn().mockResolvedValue(json(404, {}))).getItem("4901777018884")).toBeNull();
    expect(await createApi("pw", vi.fn().mockResolvedValue(json(200, { status: "success", item_id: 1, ...item }))).getItem("4901777018884")).toEqual(item);
  });

  it("register は POST、update は PATCH で JSON を送る", async () => {
    const f = vi.fn().mockResolvedValueOnce(json(201, {})).mockResolvedValueOnce(json(200, {}));
    const api = createApi("pw", f);
    await api.register(item);
    await api.update(item);
    expect(f.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify(item) });
    expect(f.mock.calls[1][1]).toMatchObject({ method: "PATCH", body: JSON.stringify(item) });
  });

  it("400 はサーバーのメッセージ付きで request、500 は server", async () => {
    await expect(createApi("pw", vi.fn().mockResolvedValue(json(400, { message: "重複" }))).register(item)).rejects.toMatchObject({
      kind: "request",
      message: "重複",
    });
    await expect(createApi("pw", vi.fn().mockResolvedValue(json(500, {}))).register(item)).rejects.toMatchObject({ kind: "server" });
  });
});
