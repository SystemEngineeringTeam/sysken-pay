import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "../../adapter/api/ApiError";
import { MemberRepositoryImpl } from "../../adapter/repository/MemberRepositoryImpl";

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());

vi.mock("../api/client", () => ({ apiClient: { GET: mockGet, POST: mockPost } }));
vi.mock("@/adapter/api/client", () => ({ apiClient: { GET: mockGet, POST: mockPost } }));

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe("MemberRepositoryImpl", () => {
  it("list: users を返す", async () => {
    mockGet.mockResolvedValue({ data: { status: "success", users: [{ user_id: "24K1" }] }, response: { status: 200 } });
    await expect(MemberRepositoryImpl.list()).resolves.toEqual([{ user_id: "24K1" }]);
    expect(mockGet).toHaveBeenCalledWith("/v1/user");
  });

  it("refund: 返した額を返す", async () => {
    mockPost.mockResolvedValue({ data: { refunded_amount: 1230 }, response: { status: 200 } });
    await expect(MemberRepositoryImpl.refund("24K01234")).resolves.toBe(1230);
    expect(mockPost).toHaveBeenCalledWith("/v1/user/{user_id}/refund", {
      params: { path: { user_id: "24K01234" } },
    });
  });

  it("stop: 残っている残高を返す", async () => {
    mockPost.mockResolvedValue({ data: { balance: 500 }, response: { status: 200 } });
    await expect(MemberRepositoryImpl.stop("24K01234")).resolves.toBe(500);
  });

  it("エラーはステータス付きで投げる", async () => {
    mockPost.mockResolvedValue({ data: undefined, error: { message: "x" }, response: { status: 409 } });
    const err = await MemberRepositoryImpl.resume("24K01234").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
  });
});
