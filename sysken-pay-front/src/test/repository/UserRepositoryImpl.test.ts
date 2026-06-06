import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRepositoryImpl } from "../../adapter/repository/UserRepositoryImpl";
import { ApiError } from "../../adapter/api/ApiError";

const mockPost = vi.hoisted(() => vi.fn());
const mockPatch = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());

vi.mock("@/adapter/api/client", () => ({
  apiClient: { POST: mockPost, PATCH: mockPatch, GET: mockGet },
}));

beforeEach(() => {
  mockPost.mockReset();
  mockPatch.mockReset();
  mockGet.mockReset();
});

describe("UserRepositoryImpl", () => {
  describe("getUser", () => {
    it("ユーザー取得が成功する", async () => {
      const response = { status: "success", user_id: "k24000", user_name: "シス研太郎" };
      mockGet.mockResolvedValue({ data: response, error: undefined, response: { status: 200 } });

      const result = await UserRepositoryImpl.getUser("k24000");
      expect(result).toEqual(response);
      expect(mockGet).toHaveBeenCalledWith("/v1/user/{user_id}", {
        params: { path: { user_id: "k24000" } },
      });
    });

    it("404 のとき status=404 の ApiError を投げる", async () => {
      mockGet.mockResolvedValue({
        data: undefined,
        error: { message: "user not found" },
        response: { status: 404 },
      });
      const promise = UserRepositoryImpl.getUser("99X99999");
      await expect(promise).rejects.toBeInstanceOf(ApiError);
      await expect(promise).rejects.toMatchObject({ status: 404, message: "user not found" });
    });

    it("400 のとき status=400 の ApiError を投げる", async () => {
      mockGet.mockResolvedValue({
        data: undefined,
        error: { message: "invalid user_id" },
        response: { status: 400 },
      });
      const promise = UserRepositoryImpl.getUser("invalid");
      await expect(promise).rejects.toBeInstanceOf(ApiError);
      await expect(promise).rejects.toMatchObject({ status: 400, message: "invalid user_id" });
    });
  });

  describe("registerUser", () => {
    it("ユーザー登録が成功する", async () => {
      const response = { status: "success", user_id: "k24000", user_name: "シス研太郎" };
      mockPost.mockResolvedValue({ data: response, error: undefined });

      const result = await UserRepositoryImpl.registerUser({ user_id: "k24000", user_name: "シス研太郎" });
      expect(result).toEqual(response);
      expect(mockPost).toHaveBeenCalledWith("/v1/user", {
        body: { user_id: "k24000", user_name: "シス研太郎" },
      });
    });

    it("エラー時に例外を投げる", async () => {
      mockPost.mockResolvedValue({ data: undefined, error: { message: "登録失敗" } });
      await expect(
        UserRepositoryImpl.registerUser({ user_id: "k24000", user_name: "シス研太郎" })
      ).rejects.toThrow("登録失敗");
    });
  });

  describe("updateUser", () => {
    it("ユーザー更新が成功する", async () => {
      const response = { status: "success", user_id: "k24000", user_name: "新しい名前" };
      mockPatch.mockResolvedValue({ data: response, error: undefined });

      const result = await UserRepositoryImpl.updateUser("k24000", { user_name: "新しい名前" });
      expect(result).toEqual(response);
      expect(mockPatch).toHaveBeenCalledWith("/v1/user/{user_id}", {
        params: { path: { user_id: "k24000" } },
        body: { user_name: "新しい名前" },
      });
    });

    it("エラー時に例外を投げる", async () => {
      mockPatch.mockResolvedValue({ data: undefined, error: { message: "更新失敗" } });
      await expect(
        UserRepositoryImpl.updateUser("k24000", { user_name: "新しい名前" })
      ).rejects.toThrow("更新失敗");
    });
  });

  describe("getBalance", () => {
    it("残高取得が成功する", async () => {
      const response = { user_id: "k24000", balance: 1500 };
      mockGet.mockResolvedValue({ data: response, error: undefined });

      const result = await UserRepositoryImpl.getBalance("k24000");
      expect(result).toEqual(response);
      expect(mockGet).toHaveBeenCalledWith("/v1/user/{user_id}/balance", {
        params: { path: { user_id: "k24000" } },
      });
    });

    it("エラー時に例外を投げる", async () => {
      mockGet.mockResolvedValue({ data: undefined, error: { message: "ユーザーが見つかりません" } });
      await expect(UserRepositoryImpl.getBalance("k99999")).rejects.toThrow("ユーザーが見つかりません");
    });
  });
});
