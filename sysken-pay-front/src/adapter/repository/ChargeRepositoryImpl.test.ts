import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChargeRepositoryImpl } from "./ChargeRepositoryImpl";

const mockPost = vi.hoisted(() => vi.fn());

vi.mock("../api/client", () => ({
  apiClient: { POST: mockPost },
}));

beforeEach(() => {
  mockPost.mockReset();
});

describe("ChargeRepositoryImpl", () => {
  describe("chargeAmount", () => {
    it("チャージが成功する", async () => {
      const response = { status: "success", charge_id: 1, charge_amount: 500, user_id: "user-1", balance: 1500 };
      mockPost.mockResolvedValue({ data: response, error: undefined });

      const result = await ChargeRepositoryImpl.chargeAmount("user-1", { amount: 500 });
      expect(result).toEqual(response);
      expect(mockPost).toHaveBeenCalledWith("/v1/user/{user_id}/charge", {
        params: { path: { user_id: "user-1" } },
        body: { amount: 500 },
      });
    });

    it("エラー時に例外を投げる", async () => {
      mockPost.mockResolvedValue({ data: undefined, error: { message: "残高不足" } });
      await expect(ChargeRepositoryImpl.chargeAmount("user-1", { amount: 500 })).rejects.toThrow("残高不足");
    });
  });

  describe("chargeCancel", () => {
    it("チャージキャンセルが成功する", async () => {
      const response = { status: "success", charge_id: 1, canceled_amount: 500, user_id: "user-1", balance: 1000 };
      mockPost.mockResolvedValue({ data: response, error: undefined });

      const result = await ChargeRepositoryImpl.chargeCancel("user-1", { amount: 500 });
      expect(result).toEqual(response);
    });

    it("エラー時に例外を投げる", async () => {
      mockPost.mockResolvedValue({ data: undefined, error: { message: "キャンセル失敗" } });
      await expect(ChargeRepositoryImpl.chargeCancel("user-1", { amount: 500 })).rejects.toThrow("キャンセル失敗");
    });
  });
});
