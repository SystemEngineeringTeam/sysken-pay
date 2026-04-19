import { describe, it, expect, vi, beforeEach } from "vitest";
import { ItemRepositoryImpl } from "./ItemRepositoryImpl";

const mockGet = vi.hoisted(() => vi.fn());

vi.mock("../api/client", () => ({
  apiClient: { GET: mockGet },
}));

beforeEach(() => {
  mockGet.mockReset();
});

describe("ItemRepositoryImpl", () => {
  describe("getAllItems", () => {
    it("商品一覧を返す", async () => {
      const items = [{ item_id: 1, item_name: "コーラ", price: 100 }];
      mockGet.mockResolvedValue({ data: { status: "success", items }, error: undefined });

      const result = await ItemRepositoryImpl.getAllItems();
      expect(result?.items).toEqual(items);
      expect(mockGet).toHaveBeenCalledWith("/v1/item");
    });

    it("エラー時に例外を投げる", async () => {
      mockGet.mockResolvedValue({ data: undefined, error: { message: "Server Error" } });
      await expect(ItemRepositoryImpl.getAllItems()).rejects.toThrow("Server Error");
    });
  });

  describe("getItemByJanCode", () => {
    it("JANコードで商品を取得する", async () => {
      const item = { item_id: 1, jan_code: "4902102072595", item_name: "コーラ", price: 100 };
      mockGet.mockResolvedValue({ data: item, error: undefined });

      const result = await ItemRepositoryImpl.getItemByJanCode("4902102072595");
      expect(result).toEqual(item);
      expect(mockGet).toHaveBeenCalledWith("/v1/item/{jan_code}", {
        params: { path: { jan_code: "4902102072595" } },
      });
    });

    it("エラー時に例外を投げる", async () => {
      mockGet.mockResolvedValue({ data: undefined, error: { message: "Not Found" } });
      await expect(ItemRepositoryImpl.getItemByJanCode("0000000000000")).rejects.toThrow("Not Found");
    });
  });
});
