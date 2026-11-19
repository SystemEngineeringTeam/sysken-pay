import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAdminLogin } from "../../hooks/useAdminLogin";

const mockVerify = vi.hoisted(() => vi.fn());

vi.mock("../../adapter/repository/AuthRepositoryImpl", () => ({
  AuthRepositoryImpl: { verify: mockVerify },
}));

beforeEach(() => {
  mockVerify.mockReset();
});

describe("useAdminLogin", () => {
  it("正しいパスワードなら true でエラーなし", async () => {
    mockVerify.mockResolvedValue(true);
    const { result } = renderHook(() => useAdminLogin());
    let ok = false;
    await act(async () => {
      ok = await result.current.login("secret");
    });
    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("違うパスワードなら false で「パスワードが違います」", async () => {
    mockVerify.mockResolvedValue(false);
    const { result } = renderHook(() => useAdminLogin());
    let ok = true;
    await act(async () => {
      ok = await result.current.login("wrong");
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("パスワードが違います");
  });

  it("サーバーに届かなければ false で「サーバーに接続できません」", async () => {
    mockVerify.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useAdminLogin());
    let ok = true;
    await act(async () => {
      ok = await result.current.login("secret");
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("サーバーに接続できません");
  });

  it("clearError でエラーが消える", async () => {
    mockVerify.mockResolvedValue(false);
    const { result } = renderHook(() => useAdminLogin());
    await act(async () => {
      await result.current.login("wrong");
    });
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});

describe("useAdminLogin（どの画面のパスワードか）", () => {
  it("指定しなければ管理者、charge ならチャージの画面のパスワードとして確かめる", async () => {
    mockVerify.mockResolvedValue(true);
    const admin = renderHook(() => useAdminLogin());
    await act(async () => {
      await admin.result.current.login("a");
    });
    expect(mockVerify).toHaveBeenLastCalledWith("admin", "a");

    const charge = renderHook(() => useAdminLogin("charge"));
    await act(async () => {
      await charge.result.current.login("c");
    });
    expect(mockVerify).toHaveBeenLastCalledWith("charge", "c");
  });
});
