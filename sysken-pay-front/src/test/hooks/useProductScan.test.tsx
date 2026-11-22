import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProductScan } from "../../hooks/useBarcodeReader";
import { useCartStore } from "../../store/useCartStore";
import { STUDENT_ID_NOT_ACCEPTED } from "../../services/paymentScan";

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
  for (const m of [mockNavigate, mockResolve, mockGetBalance, mockGetItem]) m.mockReset();
  useCartStore.getState().clearCart();
});

const scan = async (code: string) => {
  const { result } = renderHook(() => useProductScan());
  await act(async () => {
    await result.current.onScan(code);
  });
};

describe("useProductScan（ホーム）", () => {
  it("シス研Payバーコードをかざすと、名前と残高を持って残高の画面へ。カートは変えない", async () => {
    mockResolve.mockResolvedValue({ user_id: "24K01234", user_name: "yamada" });
    mockGetBalance.mockResolvedValue({ balance: 580 });
    await scan(CODE);
    expect(mockNavigate).toHaveBeenCalledWith("/balance", { state: { userName: "yamada", balance: 580 } });
    expect(mockGetItem).not.toHaveBeenCalled();
    expect(useCartStore.getState().cartItems).toEqual([]);
  });

  it("残高が 0 円でも 0 円として出す", async () => {
    mockResolve.mockResolvedValue({ user_id: "24K01234", user_name: "yamada" });
    mockGetBalance.mockResolvedValue({ balance: 0 });
    await scan(CODE);
    expect(mockNavigate).toHaveBeenCalledWith("/balance", { state: { userName: "yamada", balance: 0 } });
  });

  it("バーコードを確かめられなければ、残高の画面へは進まない", async () => {
    mockResolve.mockRejectedValue(new Error("boom"));
    await scan(CODE);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGetBalance).not.toHaveBeenCalled();
  });

  it("学生証は API に送らない", async () => {
    const { result } = renderHook(() => useProductScan());
    await act(async () => {
      await result.current.onScan("24K01234");
    });
    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockGetItem).not.toHaveBeenCalled();
    expect(STUDENT_ID_NOT_ACCEPTED).toBeTruthy();
  });

  it("商品をかざすと、カートに足して一覧へ", async () => {
    const chips = { item_id: 1, item_name: "ポテト", jan_code: "4901330502881", price: 150 };
    mockGetItem.mockResolvedValue(chips);
    await scan("4901330502881");
    expect(useCartStore.getState().cartItems).toEqual([{ item: chips, quantity: 1 }]);
    expect(mockNavigate).toHaveBeenCalledWith("/buy/list");
  });
});
