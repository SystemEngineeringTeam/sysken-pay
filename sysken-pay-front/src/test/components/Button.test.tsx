import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "@/components/ui/Button";

describe("Button", () => {
  it("childrenを表示する", () => {
    render(<Button>テスト</Button>);
    expect(screen.getByText("テスト")).toBeInTheDocument();
  });

  it("クリック時にonClickが呼ばれる", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>クリック</Button>);
    fireEvent.click(screen.getByText("クリック"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("size=lgのときボタンが描画される", () => {
    render(<Button size="lg">大きいボタン</Button>);
    expect(screen.getByRole("button", { name: "大きいボタン" })).toBeInTheDocument();
  });

  it("size=smのときボタンが描画される", () => {
    render(<Button size="sm">小さいボタン</Button>);
    expect(screen.getByRole("button", { name: "小さいボタン" })).toBeInTheDocument();
  });
});
