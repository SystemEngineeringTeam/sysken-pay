import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("押したボタンの処理を呼ぶ", () => {
    const ok = vi.fn();
    const cancel = vi.fn();
    render(
      <ConfirmDialog
        title="返金しますか？"
        actions={[
          { label: "やめる", onClick: cancel, variant: "plain" },
          { label: "現金を渡した", onClick: ok },
        ]}
      />,
    );
    expect(screen.getByRole("dialog", { name: "返金しますか？" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("現金を渡した"));
    expect(ok).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("処理中はボタンを押せない（2回押しで2回返金しないように）", () => {
    const ok = vi.fn();
    render(<ConfirmDialog title="x" busy actions={[{ label: "現金を渡した", onClick: ok }]} />);
    fireEvent.click(screen.getByText("現金を渡した"));
    expect(ok).not.toHaveBeenCalled();
  });
});
