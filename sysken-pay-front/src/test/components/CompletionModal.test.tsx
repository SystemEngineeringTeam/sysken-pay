import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompletionModal } from "@/components/ui/CompletionModal";

describe("CompletionModal", () => {
  describe("userRegisterモード", () => {
    it("ユーザー名と登録完了メッセージを表示する", () => {
      render(<CompletionModal mode="userRegister" name="シス研太郎" onClose={vi.fn()} />);
      expect(screen.getByText("シス研太郎さん")).toBeInTheDocument();
      expect(screen.getByText(/登録が完了しました/)).toBeInTheDocument();
    });

    it("「ホームへ戻る」ボタンを表示する", () => {
      render(<CompletionModal mode="userRegister" name="シス研太郎" onClose={vi.fn()} />);
      expect(screen.getByText("ホームへ戻る")).toBeInTheDocument();
    });
  });

  describe("itemRegisterモード", () => {
    it("商品名と金額と登録完了メッセージを表示する", () => {
      render(<CompletionModal mode="itemRegister" name="コーラ" price={150} onClose={vi.fn()} />);
      expect(screen.getByText("コーラ ¥150")).toBeInTheDocument();
      expect(screen.getByText(/登録が完了しました/)).toBeInTheDocument();
    });

    it("「メニューへ戻る」ボタンを表示する", () => {
      render(<CompletionModal mode="itemRegister" name="コーラ" price={150} onClose={vi.fn()} />);
      expect(screen.getByText("メニューへ戻る")).toBeInTheDocument();
    });
  });

  describe("itemUpdateモード", () => {
    it("「更新が完了しました」メッセージを表示する", () => {
      render(<CompletionModal mode="itemUpdate" name="コーラ" price={150} onClose={vi.fn()} />);
      expect(screen.getByText(/更新が完了しました/)).toBeInTheDocument();
    });

    it("「メニューへ戻る」ボタンを表示する", () => {
      render(<CompletionModal mode="itemUpdate" name="コーラ" price={150} onClose={vi.fn()} />);
      expect(screen.getByText("メニューへ戻る")).toBeInTheDocument();
    });
  });

  it("ボタンクリックでonCloseが呼ばれる", () => {
    const onClose = vi.fn();
    render(<CompletionModal mode="userRegister" name="シス研太郎" onClose={onClose} />);
    fireEvent.click(screen.getByText("ホームへ戻る"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
