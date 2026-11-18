import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ApiError } from "../../adapter/api/ApiError";
import { useUserScan } from "../../hooks/useBarcodeReader";
import { useUserStore } from "../../store/useUserStore";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockGetBalance = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
vi.mock("../../adapter/repository/UserRepositoryImpl", () => ({
  UserRepositoryImpl: { getUser: mockGetUser, getBalance: mockGetBalance },
}));

beforeEach(() => {
  mockNavigate.mockReset();
  mockGetUser.mockReset();
  mockGetBalance.mockReset();
  useUserStore.getState().clearScannedUser();
});

describe("useUserScan", () => {
  it("登録済みなら残高を取って指定の画面へ進む", async () => {
    mockGetUser.mockResolvedValue({ user_id: "20K23099", user_name: "太郎" });
    mockGetBalance.mockResolvedValue({ user_id: "20K23099", balance: 500 });

    const { result } = renderHook(() => useUserScan("/buy/sysken-pay/confirm"));
    await act(async () => {
      await result.current.onScan("20K23099");
    });

    expect(mockGetUser).toHaveBeenCalledWith("20K23099");
    expect(mockNavigate).toHaveBeenCalledWith("/buy/sysken-pay/confirm");
    expect(useUserStore.getState().scannedUser?.user_id).toBe("20K23099");
  });

  it("行き先を指定しなければチャージ金額選択へ進む", async () => {
    mockGetUser.mockResolvedValue({ user_id: "20K23099", user_name: "太郎" });
    mockGetBalance.mockResolvedValue({ user_id: "20K23099", balance: 0 });

    const { result } = renderHook(() => useUserScan());
    await act(async () => {
      await result.current.onScan("20K23099");
    });

    expect(mockNavigate).toHaveBeenCalledWith("/charge/select");
  });

  it("未登録のバーコードなら残高を取らず、先へ進まない", async () => {
    mockGetUser.mockRejectedValue(new ApiError("user not found", 404));

    const { result } = renderHook(() => useUserScan("/buy/sysken-pay/confirm"));
    await act(async () => {
      await result.current.onScan("99Z99999");
    });

    expect(mockGetBalance).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useUserStore.getState().scannedUser).toBeNull();
  });
});
