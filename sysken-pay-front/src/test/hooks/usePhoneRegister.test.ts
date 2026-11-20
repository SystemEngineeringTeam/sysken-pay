import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ApiError } from "../../adapter/api/ApiError";
import { usePhoneRegister } from "../../hooks/usePhoneRegister";
import { QR_DISPLAY_SECONDS } from "../../services/qrUrl";

const mockIssue = vi.hoisted(() => vi.fn());
const mockEndpoint = vi.hoisted(() => vi.fn());

vi.mock("../../adapter/repository/HriRepositoryImpl", () => ({
  HriRepositoryImpl: { issue: mockIssue },
}));
vi.mock("../../services/qrUrl", async (orig) => ({
  ...(await orig<typeof import("../../services/qrUrl")>()),
  getQrEndpoint: mockEndpoint,
}));

const issued = {
  status: "success",
  user_id: "24K01234",
  user_name: "シス研太郎",
  hri: "SP7Q2KX9MDRA4TW8YZ",
};

beforeEach(() => {
  vi.useFakeTimers();
  mockIssue.mockReset();
  mockEndpoint.mockReset();
  mockEndpoint.mockReturnValue("https://qr.pay.sysken.net");
});
afterEach(() => {
  vi.useRealTimers();
});

describe("usePhoneRegister", () => {
  it("学生証を読むと、エンドポイント + #a=<文字列> の QR を表示する", async () => {
    mockIssue.mockResolvedValue(issued);

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      await result.current.start("24K01234");
    });
    expect(mockIssue).toHaveBeenCalledWith("24K01234");
    expect(result.current.phase).toBe("showing");
    expect(result.current.qrUrl).toBe("https://qr.pay.sysken.net/#a=SP7Q2KX9MDRA4TW8YZ");
    expect(result.current.userName).toBe("シス研太郎");
    expect(result.current.remaining).toBe(QR_DISPLAY_SECONDS);
    expect(QR_DISPLAY_SECONDS).toBe(120);
  });

  it("2分たったら QR を消して期限切れになる", async () => {
    mockIssue.mockResolvedValue(issued);

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      await result.current.start("24K01234");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync((QR_DISPLAY_SECONDS - 1) * 1000);
    });
    expect(result.current.phase).toBe("showing");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.phase).toBe("expired");
    expect(result.current.qrUrl).toBeNull();
  });

  it("エンドポイントが未設定なら、発行する前に断る（古いバーコードを止めない）", async () => {
    mockEndpoint.mockReturnValue(null);

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      await result.current.start("24K01234");
    });
    expect(mockIssue).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("scan");
    expect(result.current.error).toContain("VITE_QR_ENDPOINT");
  });

  it("登録されていない学生証なら、読み取りの画面に戻ってメッセージを出す", async () => {
    mockIssue.mockRejectedValue(new ApiError("user not found", 404));

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      await result.current.start("99Z99999");
    });
    expect(result.current.phase).toBe("scan");
    expect(result.current.qrUrl).toBeNull();
    expect(result.current.error).toContain("登録されていない学生証です");
  });

  it("読み取りが2回続いても発行は1回しかしない", async () => {
    let resolve: (v: typeof issued) => void = () => {};
    mockIssue.mockReturnValue(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      void result.current.start("24K01234");
      void result.current.start("24K01234");
      resolve(issued);
    });
    expect(mockIssue).toHaveBeenCalledTimes(1);
  });

  it("もう一度で読み取りの画面に戻り、QR は残らない", async () => {
    mockIssue.mockResolvedValue(issued);

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      await result.current.start("24K01234");
    });
    act(() => result.current.reset());
    expect(result.current.phase).toBe("scan");
    expect(result.current.qrUrl).toBeNull();
    expect(result.current.userName).toBe("");
  });
});
