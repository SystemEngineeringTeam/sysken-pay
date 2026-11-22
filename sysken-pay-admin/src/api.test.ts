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
    expect(await createApi("pw", vi.fn().mockResolvedValue(json(200, { status: "success", item_id: 1, ...item }))).getItem("4901777018884")).toEqual({ ...item, disabled: false });
    expect(await createApi("pw", vi.fn().mockResolvedValue(json(200, { status: "success", item_id: 1, ...item, disabled: true }))).getItem("4901777018884")).toEqual({ ...item, disabled: true });
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

  it("ユーザー系：URL・メソッド・応答", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(200, { users: [{ user_id: "24K00001" }] }))
      .mockResolvedValueOnce(json(200, { status: "success", user_id: "24K00001", refunded_amount: 300 }))
      .mockResolvedValueOnce(json(200, { status: "success", user_id: "24K00001", balance: 0 }))
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(201, { hri: "SP7Q2K", user_name: "山田" }))
      .mockResolvedValueOnce(json(200, { user_id: "24K00009", user_name: "山田" }))
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(200, {}));
    const api = createApi("pw", f, "https://x");
    expect(await api.listUsers()).toHaveLength(1);
    expect(await api.refund("24K00001")).toBe(300);
    expect(await api.stop("24K00001")).toBe(0);
    await api.resume("24K00001");
    expect(await api.issueHri("24K00001")).toEqual({ hri: "SP7Q2K", user_name: "山田" });
    expect(await api.updateUser("24K00001", { user_name: "山田", user_id: "24K00009" })).toEqual({ user_id: "24K00009", user_name: "山田" });
    await api.remove("24K00009");
    await api.hide("24K00001");
    await api.unhide("24K00001");
    const calls = f.mock.calls.map((c) => [c[0], c[1].method ?? "GET"]);
    expect(calls).toEqual([
      ["https://x/v1/user", "GET"],
      ["https://x/v1/user/24K00001/refund", "POST"],
      ["https://x/v1/user/24K00001/stop", "POST"],
      ["https://x/v1/user/24K00001/resume", "POST"],
      ["https://x/v1/user/24K00001/hri", "POST"],
      ["https://x/v1/user/24K00001", "PATCH"],
      ["https://x/v1/user/24K00009", "DELETE"],
      ["https://x/v1/user/24K00001/hide", "POST"],
      ["https://x/v1/user/24K00001/unhide", "POST"],
    ]);
  });

  it("409 は status 付きで投げる（画面で文言を出し分ける）", async () => {
    const f = vi.fn().mockResolvedValue(json(409, { message: "x" }));
    await expect(createApi("pw", f).refund("24K00001")).rejects.toMatchObject({ kind: "request", status: 409 });
  });

  it("学籍番号は URL 用にエンコードする", async () => {
    const f = vi.fn().mockResolvedValue(json(200, { refunded_amount: 0 }));
    await createApi("pw", f, "https://x").refund("a/b");
    expect(f.mock.calls[0][0]).toBe("https://x/v1/user/a%2Fb/refund");
  });

  it("listItems は items を返す。無ければ空。無効の商品も含めて頼む", async () => {
    const f = vi.fn().mockResolvedValue(json(200, { items: [item] }));
    expect(await createApi("pw", f, "https://x").listItems()).toEqual([item]);
    expect(f.mock.calls[0][0]).toBe("https://x/v1/item?include_disabled=true");
    expect(await createApi("pw", vi.fn().mockResolvedValue(json(200, {}))).listItems()).toEqual([]);
  });

  it("disableItem / enableItem は POST で、JAN を URL に入れる", async () => {
    const f = vi.fn().mockImplementation(async () => json(200, { status: "success" }));
    await createApi("pw", f, "https://x").disableItem("4901777018884");
    await createApi("pw", f, "https://x").enableItem("4901777018884");
    expect(f.mock.calls[0][0]).toBe("https://x/v1/item/4901777018884/disable");
    expect(f.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(f.mock.calls[1][0]).toBe("https://x/v1/item/4901777018884/enable");
  });

  it("disableItem: 409 や 404 は ApiError（status つき）、401 は unauthorized", async () => {
    await expect(createApi("pw", vi.fn().mockResolvedValue(json(409, { message: "x" }))).disableItem("4901777018884")).rejects.toMatchObject({ status: 409 });
    await expect(createApi("pw", vi.fn().mockResolvedValue(json(404, { message: "x" }))).enableItem("4901777018884")).rejects.toMatchObject({ status: 404 });
    await expect(createApi("bad", vi.fn().mockResolvedValue(json(401, {}))).enableItem("4901777018884")).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("Bearer: トークンを Authorization に付ける", async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await createApi(async () => "tok", f, "https://x").verify();
    expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
  });

  it("Bearer: トークンを取れなければ unauthorized（通信しない）", async () => {
    const f = vi.fn();
    await expect(createApi(async () => Promise.reject(new Error("x")), f).verify()).rejects.toMatchObject({ kind: "unauthorized" });
    expect(f).not.toHaveBeenCalled();
  });

  it("Bearer: 401 は再ログイン、verify の 403 は許可されていない", async () => {
    const tok = async () => "tok";
    await expect(createApi(tok, vi.fn().mockResolvedValue(json(401, {}))).verify()).rejects.toMatchObject({ kind: "unauthorized", message: expect.stringContaining("Microsoft") });
    await expect(createApi(tok, vi.fn().mockResolvedValue(json(403, {}))).verify()).rejects.toMatchObject({ kind: "forbidden", status: 403 });
  });

  it("パスワード: verify の 403 は forbidden にしない", async () => {
    await expect(createApi("pw", vi.fn().mockResolvedValue(json(403, {}))).verify()).rejects.toMatchObject({ kind: "request" });
  });

  it("許可リスト：URL・メソッド・応答", async () => {
    const row = { upn: "a@aitech.ac.jp", student_id: null, added_by: "password", created_at: "t" };
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(200, { status: "success", admins: [row], current: "" }))
      .mockResolvedValueOnce(json(201, { status: "success", upn: "a@aitech.ac.jp" }))
      .mockResolvedValueOnce(json(200, { status: "success", upn: "a@aitech.ac.jp" }));
    const api = createApi("pw", f, "https://x");
    expect(await api.listAdmins()).toEqual({ admins: [row], current: null });
    await api.addAdmin("a@aitech.ac.jp");
    await api.removeAdmin("a@aitech.ac.jp");
    expect(f.mock.calls[0][0]).toBe("https://x/v1/admin/allowlist");
    expect(f.mock.calls[1]).toEqual(["https://x/v1/admin/allowlist", expect.objectContaining({ method: "POST", body: JSON.stringify({ upn: "a@aitech.ac.jp" }) })]);
    expect(f.mock.calls[2]).toEqual(["https://x/v1/admin/allowlist/a%40aitech.ac.jp", expect.objectContaining({ method: "DELETE" })]);
  });

  it("許可リスト：409（最後の 1 人など）は request", async () => {
    await expect(createApi("pw", vi.fn().mockResolvedValue(json(409, { message: "最後の 1 人" }))).removeAdmin("a@aitech.ac.jp")).rejects.toMatchObject({ kind: "request", status: 409 });
  });
});

describe("registerUser", () => {
  it("POST /v1/user に学籍番号と名前を送り、201 で終わる", async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    await createApi("pw", f, "https://h").registerUser("20X24042", "愛工 太郎");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://h/v1/user");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ user_id: "20X24042", user_name: "愛工 太郎" });
  });
  it("すでにいる（409）は request のエラーで、status が付く", async () => {
    const f = vi.fn().mockResolvedValue(json(409, { error: "dup" }));
    await expect(createApi("pw", f, "https://h").registerUser("20X24042", "a")).rejects.toMatchObject({ kind: "request", status: 409 });
  });
});
