import { describe, it, expect } from "vitest";
import { ApiError } from "../../adapter/api/ApiError";
import { formatRemaining, toPhoneRegisterErrorMessage } from "../../services/phoneRegisterErrorMessage";
import { ADMIN_USER_STOPPED_MESSAGE } from "../../services/userScanErrorMessage";

describe("toPhoneRegisterErrorMessage", () => {
  it.each([
    [404, "登録されていない学生証です"],
    [400, "読み取れませんでした"],
    [401, "管理者パスワードの確認が切れました"],
    [403, "利用停止しています"],
  ])("%i", (status, part) => {
    expect(toPhoneRegisterErrorMessage(new ApiError("x", status))).toContain(part);
  });

  it("それ以外はサーバーの英語メッセージを出さない", () => {
    expect(toPhoneRegisterErrorMessage(new ApiError("db down", 500))).not.toContain("db down");
    expect(toPhoneRegisterErrorMessage(new TypeError("Failed to fetch"))).toContain("作れませんでした");
  });
});

describe("formatRemaining", () => {
  it.each([
    [300, "5:00"],
    [245, "4:05"],
    [9, "0:09"],
    [0, "0:00"],
    [-3, "0:00"],
  ])("%i 秒 → %s", (s, want) => {
    expect(formatRemaining(s)).toBe(want);
  });
});

describe("toPhoneRegisterErrorMessage（利用停止）", () => {
  it("403 は PC の管理サイトで「利用を再開」する案内", () => {
    const msg = toPhoneRegisterErrorMessage(new ApiError("user stopped", 403));
    expect(msg).toContain("管理サイト");
    expect(msg).toContain("利用を再開");
    // ユーザー一覧はラズパイから管理サイトへ移したので、ラズパイにない画面の名前を出さない
    expect(msg).not.toContain("ユーザー一覧");
  });

  it("ユーザー登録の画面と同じ文を出す", () => {
    expect(toPhoneRegisterErrorMessage(new ApiError("user stopped", 403))).toBe(ADMIN_USER_STOPPED_MESSAGE);
  });
});
