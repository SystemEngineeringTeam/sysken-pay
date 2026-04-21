import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceLabel } from "@/components/ui/PriceLabel";

describe("PriceLabel", () => {
  it("ラベルを表示する", () => {
    render(<PriceLabel label="お買い上げ金額" price={150} />);
    expect(screen.getByText("お買い上げ金額")).toBeInTheDocument();
  });

  it("金額をカンマ区切りで表示する", () => {
    render(<PriceLabel label="合計" price={1500} />);
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("¥記号を表示する", () => {
    render(<PriceLabel label="合計" price={100} />);
    expect(screen.getByText("¥")).toBeInTheDocument();
  });

  it("0円を表示する", () => {
    render(<PriceLabel label="不足額" price={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
