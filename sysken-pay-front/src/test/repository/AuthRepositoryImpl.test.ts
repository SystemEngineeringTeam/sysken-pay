import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthRepositoryImpl } from "../../adapter/repository/AuthRepositoryImpl";
import { clearAdminAccess, getAdminPassword, getAdminSession, setAdminSession } from "../../adapter/api/adminCredentials";

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock("@/adapter/api/client", () => ({
  apiClient: { GET: mockGet, POST: mockPost, DELETE: mockDelete },
}));
vi.mock("../api/client", () => ({
  apiClient: { GET: mockGet, POST: mockPost, DELETE: mockDelete },
}));

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockDelete.mockReset();
  clearAdminAccess();
});

describe("AuthRepositoryImpl.verifyAdmin", () => {
  it("204 なら true を返し、パスワードを保持する", async () => {
    mockGet.mockResolvedValue({ response: { status: 204 } });
    await expect(AuthRepositoryImpl.verifyAdmin("secret")).resolves.toBe(true);
    expect(getAdminPassword()).toBe("secret");
    expect(mockGet).toHaveBeenCalledWith("/v1/admin/verify", {
      headers: { Authorization: `Basic ${btoa("admin:secret")}` },
    });
  });

  it("401 なら false を返し、パスワードを保持しない", async () => {
    mockGet.mockResolvedValue({ response: { status: 401 } });
    await expect(AuthRepositoryImpl.verifyAdmin("wrong")).resolves.toBe(false);
    expect(getAdminPassword()).toBeNull();
  });

  it("それ以外のステータスは例外を投げる", async () => {
    mockGet.mockResolvedValue({ response: { status: 500 } });
    await expect(AuthRepositoryImpl.verifyAdmin("secret")).rejects.toThrow();
    expect(getAdminPassword()).toBeNull();
  });
});

describe("AuthRepositoryImpl.verifyCharge", () => {
  it("チャージの画面は /v1/charge/verify で確かめる", async () => {
    mockGet.mockResolvedValue({ response: { status: 204 } });
    await expect(AuthRepositoryImpl.verifyCharge("charge-pass")).resolves.toBe(true);
    expect(mockGet).toHaveBeenCalledWith("/v1/charge/verify", expect.anything());
  });

  it("違えば false", async () => {
    mockGet.mockResolvedValue({ response: { status: 401 } });
    await expect(AuthRepositoryImpl.verifyCharge("wrong")).resolves.toBe(false);
  });
});

describe("AuthRepositoryImpl.unlock（管理者バーコード）", () => {
  it("トークンが返れば Session として保持する。バーコードは本文で送る", async () => {
    mockPost.mockResolvedValue({ data: { status: "ok", token: "tok", expires_in: 600 }, response: { status: 200 } });
    await AuthRepositoryImpl.unlock("SP7Q2KX9MDRA4TW8YZ");
    expect(getAdminSession()).toBe("tok");
    expect(mockPost).toHaveBeenCalledWith("/v1/admin/unlock", { body: { hri: "SP7Q2KX9MDRA4TW8YZ" } });
  });

  it("管理者でなければ status 付きの ApiError で、何も保持しない", async () => {
    mockPost.mockResolvedValue({ error: { message: "not an admin" }, response: { status: 403 } });
    await expect(AuthRepositoryImpl.unlock("SP7Q2KX9MDRA4TW8YZ")).rejects.toMatchObject({ status: 403 });
    expect(getAdminSession()).toBeNull();
  });
});

describe("AuthRepositoryImpl.lock", () => {
  it("Session があればサーバーで取り消し、メモリからも消す", async () => {
    mockDelete.mockResolvedValue({ response: { status: 204 } });
    setAdminSession("tok");
    await AuthRepositoryImpl.lock();
    expect(mockDelete).toHaveBeenCalledWith("/v1/admin/unlock");
    expect(getAdminSession()).toBeNull();
  });

  it("サーバーに届かなくてもメモリからは消す", async () => {
    mockDelete.mockRejectedValue(new TypeError("Failed to fetch"));
    setAdminSession("tok");
    await AuthRepositoryImpl.lock();
    expect(getAdminSession()).toBeNull();
  });

  it("Session がなければ API は呼ばず、パスワードは消す", async () => {
    await AuthRepositoryImpl.lock();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
