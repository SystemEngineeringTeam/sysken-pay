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
  it("createClaim: 学籍番号を URL に入れて呼ぶ", async () => {
    const data = { claim_id: 7 };
    mockPost.mockResolvedValue({ data, error: undefined, response: { status: 201 } });
    await expect(PaymentCardRepositoryImpl.createClaim("24K01234")).resolves.toEqual(data);
    expect(mockPost).toHaveBeenCalledWith("/v1/user/{user_id}/payment-card/claim", {
      params: { path: { user_id: "24K01234" } },
    });
  });

  it("createClaim: エラーはステータス付きで投げる", async () => {
    mockPost.mockResolvedValue({ data: undefined, error: { message: "x" }, response: { status: 503 } });
    const err = await PaymentCardRepositoryImpl.createClaim("24K01234").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(503);
  });

  it("getClaimStatus", async () => {
    const data = { open_count: 1, remaining_seconds: 100, expired: false };
    mockGet.mockResolvedValue({ data, error: undefined, response: { status: 200 } });
    await expect(PaymentCardRepositoryImpl.getClaimStatus(7)).resolves.toEqual(data);
    expect(mockGet).toHaveBeenCalledWith("/v1/payment-card/claim/{claim_id}", {
      params: { path: { claim_id: 7 } },
    });
  });
});

describe("PaymentCardRepositoryImpl.resolve", () => {
  it("バーコードは URL ではなく本文で送る", async () => {
    const data = { status: "success", user_id: "24K01234", user_name: "太郎" };
    mockPost.mockResolvedValue({ data, error: undefined, response: { status: 200 } });
    await expect(PaymentCardRepositoryImpl.resolve("SP7Q2KX9MDRA4TW8YZ")).resolves.toEqual(data);
    expect(mockPost).toHaveBeenCalledWith("/v1/payment-card/resolve", { body: { code: "SP7Q2KX9MDRA4TW8YZ" } });
  });

  it("エラーはステータス付きで投げる", async () => {
    mockPost.mockResolvedValue({ data: undefined, error: { message: "x" }, response: { status: 403 } });
    const err = await PaymentCardRepositoryImpl.resolve("SP7Q2KX9MDRA4TW8YZ").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
  });
});
