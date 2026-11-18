import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Header from "../../components/layouts/Header";

const renderHeader = (right?: "toTop", confirmHome = false) =>
  render(
    <MemoryRouter initialEntries={["/somewhere"]}>
      <Routes>
        <Route path="/" element={<p>ホーム</p>} />
        <Route path="/somewhere" element={<Header title="テスト" right={right} confirmHome={confirmHome} />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Header のアイコン", () => {
  it("押すとホームへ飛ぶ", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "ホームに戻る" }));
    expect(screen.getByText("ホーム")).toBeTruthy();
  });

  it("購入の途中（toTop）は確認を出し、「戻る」でホームへ飛ぶ", () => {
    renderHeader("toTop");
    fireEvent.click(screen.getByRole("button", { name: "ホームに戻る" }));
    expect(screen.queryByText("ホーム")).toBeNull();
    expect(screen.getByText("本当に最初から戻りますか？")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "戻る" }));
    expect(screen.getByText("ホーム")).toBeTruthy();
  });

  it("confirmHome を付けた画面（チャージ）も確認を出す", () => {
    renderHeader(undefined, true);
    fireEvent.click(screen.getByRole("button", { name: "ホームに戻る" }));
    expect(screen.queryByText("ホーム")).toBeNull();
    expect(screen.getByText("本当に最初から戻りますか？")).toBeTruthy();
  });

  it("確認で「キャンセル」するとそのまま", () => {
    renderHeader("toTop");
    fireEvent.click(screen.getByRole("button", { name: "ホームに戻る" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByText("本当に最初から戻りますか？")).toBeNull();
  });
});
