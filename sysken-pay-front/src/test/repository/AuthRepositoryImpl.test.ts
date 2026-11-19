import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthRepositoryImpl } from "../../adapter/repository/AuthRepositoryImpl";
import { clearAdminPassword, getAdminPassword } from "../../adapter/api/adminCredentials";

const mockGet = vi.hoisted(() => vi.fn());

vi.mock("@/adapter/api/client", () => ({
  apiClient: { GET: mockGet },
}));
vi.mock("../api/client", () => ({
  apiClient: { GET: mockGet },
}));

beforeEach(() => {
  mockGet.mockReset();
  clearAdminPassword();
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
