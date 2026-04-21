import { describe, it, expect, vi, beforeEach } from "vitest";
import { PurchaseRepositoryImpl } from "@/adapter/repository/PurchaseRepositoryImpl";

const mockPost = vi.hoisted(() => vi.fn());

vi.mock("@/adapter/api/client", () => ({
  apiClient: { POST: mockPost },
}));

beforeEach(() => {
  mockPost.mockReset();
});

describe("PurchaseRepositoryImpl", () => {
  describe("createPurchase", () => {
    it("購入が成功する", async () => {
      const response = { status: "success", purchase_id: 1, user_id: "k24000", balance: 800 };
      mockPost.mockResolvedValue({ data: response, error: undefined });

      const body = { items: [{ item_id: 1, quantity: 2 }] };
      const result = await PurchaseRepositoryImpl.createPurchase("k24000", body);
      expect(result).toEqual(response);
      expect(mockPost).toHaveBeenCalledWith("/v1/user/{user_id}/purchase", {
        params: { path: { user_id: "k24000" } },
        body,
      });
    });

    it("エラー時に例外を投げる", async () => {
      mockPost.mockResolvedValue({ data: undefined, error: { message: "残高不足" } });
      await expect(
        PurchaseRepositoryImpl.createPurchase("k24000", { items: [{ item_id: 1, quantity: 1 }] })
      ).rejects.toThrow("残高不足");
    });
  });

  describe("cancelPurchase", () => {
    it("購入キャンセルが成功する", async () => {
      const response = { status: "success", purchase_id: 1, user_id: "k24000", balance: 1000 };
      mockPost.mockResolvedValue({ data: response, error: undefined });

      const result = await PurchaseRepositoryImpl.cancelPurchase("k24000", { purchase_id: 1 });
      expect(result).toEqual(response);
      expect(mockPost).toHaveBeenCalledWith("/v1/user/{user_id}/purchase/cancel", {
        params: { path: { user_id: "k24000" } },
        body: { purchase_id: 1 },
      });
    });

    it("エラー時に例外を投げる", async () => {
      mockPost.mockResolvedValue({ data: undefined, error: { message: "キャンセル失敗" } });
      await expect(
        PurchaseRepositoryImpl.cancelPurchase("k24000", { purchase_id: 99 })
      ).rejects.toThrow("キャンセル失敗");
    });
  });
});
