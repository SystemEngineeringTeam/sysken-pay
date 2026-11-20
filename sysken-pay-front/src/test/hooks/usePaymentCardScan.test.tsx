import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ApiError } from "../../adapter/api/ApiError";
import { usePaymentCardScan, useProductScan } from "../../hooks/useBarcodeReader";
import { useUserStore } from "../../store/useUserStore";
import { useBalanceStore } from "../../store/useBalanceStore";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockResolve = vi.hoisted(() => vi.fn());
const mockGetBalance = vi.hoisted(() => vi.fn());
const mockGetItem = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
vi.mock("../../adapter/repository/HriRepositoryImpl", () => ({
  HriRepositoryImpl: { resolve: mockResolve },
}));
vi.mock("../../adapter/repository/UserRepositoryImpl", () => ({
  UserRepositoryImpl: { getBalance: mockGetBalance },
}));
vi.mock("../../adapter/repository/ItemRepositoryImpl", () => ({
  ItemRepositoryImpl: { getItemByJanCode: mockGetItem },
}));

const CODE = "SP7Q2KX9MDRA4TW8YZ";

beforeEach(() => {
  mockNavigate.mockReset();
  mockResolve.mockReset();
  mockGetBalance.mockReset();
  mockGetItem.mockReset();
  useUserStore.getState().clearScannedUser();
});

describe("usePaymentCardScan", () => {
  it("バーコードの持ち主と残高を調べて、指定の画面へ進む（名前も覚える）", async () => {
    mockResolve.mockResolvedValue({ status: "success", user_id: "24K01234", user_name: "k24000_yamadataro" });
    mockGetBalance.mockResolvedValue({ user_id: "24K01234", balance: 500 });

    const { result } = renderHook(() => usePaymentCardScan("/buy/sysken-pay/confirm"));
    await act(async () => {
      await result.current.onScan(CODE);
    });

    expect(mockResolve).toHaveBeenCalledWith(CODE);
    expect(mockGetBalance).toHaveBeenCalledWith("24K01234");
    expect(mockNavigate).toHaveBeenCalledWith("/buy/sysken-pay/confirm");
    expect(useUserStore.getState().scannedUser).toEqual({ user_id: "24K01234", user_name: "k24000_yamadataro" });
    expect(useBalanceStore.getState().balance?.balance).toBe(500);
  });

  it("行き先を指定しなければチャージ金額選択へ進む", async () => {
    mockResolve.mockResolvedValue({ status: "success", user_id: "24K01234", user_name: "太郎" });
    mockGetBalance.mockResolvedValue({ user_id: "24K01234", balance: 0 });

    const { result } = renderHook(() => usePaymentCardScan());
    await act(async () => {
      await result.current.onScan(CODE);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/charge/select");
  });

  it("学生証を読んだときは API に送らず、先へ進まない", async () => {
    const { result } = renderHook(() => usePaymentCardScan());
    await act(async () => {
      await result.current.onScan("24K01234");
    });

    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("使えないバーコードなら残高を取らず、先へ進まない", async () => {
    mockResolve.mockRejectedValue(new ApiError("payment card not found", 404));

    const { result } = renderHook(() => usePaymentCardScan("/buy/sysken-pay/confirm"));
    await act(async () => {
      await result.current.onScan(CODE);
    });

    expect(mockGetBalance).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useUserStore.getState().scannedUser).toBeNull();
  });
});

describe("useProductScan（支払い用バーコード）", () => {
  it("SP から始まるバーコードは商品の API に送らない", async () => {
    const { result } = renderHook(() => useProductScan());
    await act(async () => {
      await result.current.onScan("sp 7q2k x9md ra4t w8yz");
    });

    expect(mockGetItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
