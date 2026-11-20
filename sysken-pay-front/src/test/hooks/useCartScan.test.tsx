import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCartScan } from "../../hooks/useBarcodeReader";
import { useCartStore } from "../../store/useCartStore";
import { ApiError } from "../../adapter/api/ApiError";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockResolve = vi.hoisted(() => vi.fn());
const mockGetBalance = vi.hoisted(() => vi.fn());
const mockGetItem = vi.hoisted(() => vi.fn());
const mockPurchase = vi.hoisted(() => vi.fn());

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
vi.mock("../../adapter/repository/PurchaseRepositoryImpl", () => ({
  PurchaseRepositoryImpl: { createPurchase: mockPurchase },
}));

const CODE = "SP7Q2KX9MDRA4TW8YZ";
const chips = { item_id: 1, item_name: "ポテトチップス", jan_code: "4901330502881", price: 150 };
const coffee = { item_id: 2, item_name: "コーヒー", jan_code: "4901085089316", price: 120 };

beforeEach(() => {
  for (const m of [mockNavigate, mockResolve, mockGetBalance, mockGetItem, mockPurchase]) m.mockReset();
  useCartStore.getState().clearCart();
});

const scan = async (code: string) => {
  const { result } = renderHook(() => useCartScan());
  await act(async () => {
    await result.current.onScan(code);
  });
  return result;
};

describe("useCartScan", () => {
  it("商品をかざすとカートに足し、画面はそのまま", async () => {
    mockGetItem.mockResolvedValue(chips);
    await scan("4901330502881");
    expect(useCartStore.getState().cartItems).toEqual([{ item: chips, quantity: 1 }]);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("シス研Payバーコードをかざすと、カートの中身ですぐ買って完了画面へ（名前・合計・残高を渡す）", async () => {
    useCartStore.getState().addItem(chips);
    useCartStore.getState().addItem(chips);
    useCartStore.getState().addItem(coffee);
    mockResolve.mockResolvedValue({ status: "success", user_id: "24K01234", user_name: "k24000_yamadataro" });
    mockPurchase.mockResolvedValue({ user_id: "24K01234", balance: 580 });

    await scan(CODE);

    expect(mockPurchase).toHaveBeenCalledWith("24K01234", {
      items: [
        { item_id: 1, quantity: 2 },
        { item_id: 2, quantity: 1 },
      ],
    });
    expect(mockNavigate).toHaveBeenCalledWith("/buy/complete", {
      state: { userName: "k24000_yamadataro", total: 420, balance: 580 },
    });
    expect(useCartStore.getState().cartItems).toEqual([]);
  });

  it("カートが空なら買わない", async () => {
    await scan(CODE);
    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockPurchase).not.toHaveBeenCalled();
  });

  it("使えないバーコードなら買わず、カートも残す", async () => {
    useCartStore.getState().addItem(chips);
    mockResolve.mockRejectedValue(new ApiError("payment card not found", 404));
    await scan(CODE);
    expect(mockPurchase).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useCartStore.getState().cartItems).toHaveLength(1);
  });

  it("残高が足りなければ、カートを残して完了画面へ進まない（残高を調べて不足額を出す）", async () => {
    useCartStore.getState().addItem(chips);
    mockResolve.mockResolvedValue({ status: "success", user_id: "24K01234", user_name: "太郎" });
    mockPurchase.mockRejectedValue(new Error("insufficient balance"));
    mockGetBalance.mockResolvedValue({ user_id: "24K01234", balance: 100 });

    await scan(CODE);

    expect(mockGetBalance).toHaveBeenCalledWith("24K01234");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useCartStore.getState().cartItems).toHaveLength(1);
  });

  it("学生証は API に送らない", async () => {
    useCartStore.getState().addItem(chips);
    await scan("24K01234");
    expect(mockGetItem).not.toHaveBeenCalled();
    expect(mockResolve).not.toHaveBeenCalled();
  });
});
