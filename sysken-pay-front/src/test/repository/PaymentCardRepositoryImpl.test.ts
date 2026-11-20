import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "../../adapter/api/ApiError";
import { PaymentCardRepositoryImpl } from "../../adapter/repository/PaymentCardRepositoryImpl";

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());

vi.mock("../api/client", () => ({ apiClient: { GET: mockGet, POST: mockPost } }));
vi.mock("@/adapter/api/client", () => ({ apiClient: { GET: mockGet, POST: mockPost } }));

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe("PaymentCardRepositoryImpl", () => {
  it("issue: 学籍番号を URL に入れて呼び、HRI を受け取る", async () => {
    const data = { status: "success", user_id: "24K01234", user_name: "太郎", hri: "SP7Q2KX9MDRA4TW8YZ", display_hri: "SP 7Q2K X9MD RA4T W8YZ" };
    mockPost.mockResolvedValue({ data, error: undefined, response: { status: 201 } });
    await expect(PaymentCardRepositoryImpl.issue("24K01234")).resolves.toEqual(data);
    expect(mockPost).toHaveBeenCalledWith("/v1/user/{user_id}/hri", {
      params: { path: { user_id: "24K01234" } },
    });
  });

  it("issue: エラーはステータス付きで投げる", async () => {
    mockPost.mockResolvedValue({ data: undefined, error: { message: "x" }, response: { status: 403 } });
    const err = await PaymentCardRepositoryImpl.issue("24K01234").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
  });
});

describe("PaymentCardRepositoryImpl.resolve", () => {
  it("HRI は GET /v1/user の hri クエリで送る", async () => {
    const data = { status: "success", user_id: "24K01234", user_name: "太郎" };
    mockGet.mockResolvedValue({ data, error: undefined, response: { status: 200 } });
    await expect(PaymentCardRepositoryImpl.resolve("SP7Q2KX9MDRA4TW8YZ")).resolves.toEqual(data);
    expect(mockGet).toHaveBeenCalledWith("/v1/user", { params: { query: { hri: "SP7Q2KX9MDRA4TW8YZ" } } });
  });

  it("ユーザー一覧の形（user_id が無い）が返ってきたら失敗にする", async () => {
    mockGet.mockResolvedValue({ data: { status: "success", users: [] }, error: undefined, response: { status: 200 } });
    await expect(PaymentCardRepositoryImpl.resolve("SP7Q2KX9MDRA4TW8YZ")).rejects.toBeInstanceOf(ApiError);
  });

  it("エラーはステータス付きで投げる", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { message: "x" }, response: { status: 403 } });
    const err = await PaymentCardRepositoryImpl.resolve("SP7Q2KX9MDRA4TW8YZ").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
  });
});
