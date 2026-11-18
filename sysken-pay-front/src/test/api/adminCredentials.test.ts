import { describe, it, expect, beforeEach } from "vitest";
import {
  basicAuthHeader,
  clearAdminPassword,
  getAdminPassword,
  setAdminPassword,
} from "../../adapter/api/adminCredentials";
import { adminAuthMiddleware } from "../../adapter/api/client";

type OnRequest = NonNullable<typeof adminAuthMiddleware.onRequest>;

const runMiddleware = async (request: Request): Promise<Request> => {
  const onRequest = adminAuthMiddleware.onRequest as OnRequest;
  const result = await onRequest({
    request,
    schemaPath: "",
    params: {},
    id: "test",
    options: {} as Parameters<OnRequest>[0]["options"],
  });
  return (result as Request | undefined) ?? request;
};

beforeEach(() => {
  clearAdminPassword();
});

describe("basicAuthHeader", () => {
  it("ユーザー名とパスワードを Base64 にする", () => {
    expect(basicAuthHeader("admin", "secret")).toBe(`Basic ${btoa("admin:secret")}`);
  });

  it("日本語のパスワードも UTF-8 で扱える", () => {
    const header = basicAuthHeader("admin", "シス研");
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(header.replace("Basic ", "")), (c) => c.charCodeAt(0))
    );
    expect(decoded).toBe("admin:シス研");
  });
});

describe("管理者パスワードの保持", () => {
  it("set したら取得でき、clear したら消える", () => {
    setAdminPassword("secret");
    expect(getAdminPassword()).toBe("secret");
    clearAdminPassword();
    expect(getAdminPassword()).toBeNull();
  });
});

describe("adminAuthMiddleware", () => {
  it("パスワード未確認のときは Authorization を付けない", async () => {
    const req = await runMiddleware(new Request("http://localhost:8080/v1/item"));
    expect(req.headers.get("Authorization")).toBeNull();
  });

  it("パスワード確認済みなら Authorization を付ける", async () => {
    setAdminPassword("secret");
    const req = await runMiddleware(new Request("http://localhost:8080/v1/item", { method: "POST" }));
    expect(req.headers.get("Authorization")).toBe(basicAuthHeader("admin", "secret"));
  });

  it("すでに Authorization があれば上書きしない", async () => {
    setAdminPassword("secret");
    const req = await runMiddleware(
      new Request("http://localhost:8080/v1/admin/verify", {
        headers: { Authorization: "Basic other" },
      })
    );
    expect(req.headers.get("Authorization")).toBe("Basic other");
  });
});
