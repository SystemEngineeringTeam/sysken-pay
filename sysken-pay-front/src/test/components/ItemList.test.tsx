import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ItemList } from "@/components/features/buy/ItemList";
import type { CartItem } from "@/store/useCartStore";

const cola: CartItem = { item: { item_id: 1, item_name: "コーラ", price: 100, jan_code: "111" }, quantity: 2 };
const tea: CartItem = { item: { item_id: 2, item_name: "お茶", price: 150, jan_code: "222" }, quantity: 1 };

describe("ItemList", () => {
  it("2個以上の商品には「−1」、1個の商品には「削除」を出す", () => {
    render(<ItemList Items={[cola, tea]} onDelete={() => {}} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["−1", "削除✕"]);
  });

  it("ボタンを押すと、その商品の ID で onDelete を呼ぶ", () => {
    const onDelete = vi.fn();
    render(<ItemList Items={[cola, tea]} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "−1" }));
    expect(onDelete).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "削除✕" }));
    expect(onDelete).toHaveBeenLastCalledWith(2);
    expect(onDelete).toHaveBeenCalledTimes(2);
  });
});
