import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ApiError } from "../../adapter/api/ApiError";
import { STATUS_POLL_MS, usePhoneRegister } from "../../hooks/usePhoneRegister";

const mockCreate = vi.hoisted(() => vi.fn());
const mockStatus = vi.hoisted(() => vi.fn());

vi.mock("../../adapter/repository/PaymentCardRepositoryImpl", () => ({
  PaymentCardRepositoryImpl: { createClaim: mockCreate, getClaimStatus: mockStatus },
}));

const created = {
  status: "success",
  claim_id: 7,
  user_id: "24K01234",
  user_name: "シス研太郎",
  url: "http://192.0.2.10:8081/claim#t=x",
  expires_in_seconds: 300,
};

beforeEach(() => {
  vi.useFakeTimers();
  mockCreate.mockReset();
  mockStatus.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("usePhoneRegister", () => {
  it("学生証を読むと QR を表示し、残り時間と開かれた回数が更新される", async () => {
    mockCreate.mockResolvedValue(created);
    mockStatus.mockResolvedValue({ status: "success", open_count: 1, remaining_seconds: 290, expired: false });

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      await result.current.start("24K01234");
    });
    expect(mockCreate).toHaveBeenCalledWith("24K01234");
    expect(result.current.phase).toBe("showing");
    expect(result.current.remaining).toBe(300);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(STATUS_POLL_MS);
    });
    expect(mockStatus).toHaveBeenCalledWith(7);
    expect(result.current.openCount).toBe(1);
    expect(result.current.remaining).toBe(290);
  });

  it("残り時間が 0 になったら期限切れになる", async () => {
    mockCreate.mockResolvedValue({ ...created, expires_in_seconds: 3 });
    mockStatus.mockRejectedValue(new Error("offline")); // 状態が取れなくても手元で数える

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      await result.current.start("24K01234");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.phase).toBe("expired");
  });

  it("サーバーが期限切れと返したら期限切れになる", async () => {
    mockCreate.mockResolvedValue(created);
    mockStatus.mockResolvedValue({ status: "success", open_count: 0, remaining_seconds: 0, expired: true });

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      await result.current.start("24K01234");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STATUS_POLL_MS);
    });
    expect(result.current.phase).toBe("expired");
  });

  it("登録されていない学生証なら、読み取りの画面に戻ってメッセージを出す", async () => {
    mockCreate.mockRejectedValue(new ApiError("user not found", 404));

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      await result.current.start("99Z99999");
    });
    expect(result.current.phase).toBe("scan");
    expect(result.current.error).toContain("登録されていない学生証です");
  });

  it("読み取りが2回続いても QR は1回しか作らない", async () => {
    let resolve: (v: typeof created) => void = () => {};
    mockCreate.mockReturnValue(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      void result.current.start("24K01234");
      void result.current.start("24K01234");
      resolve(created);
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("もう一度で読み取りの画面に戻る", async () => {
    mockCreate.mockResolvedValue({ ...created, expires_in_seconds: 1 });
    mockStatus.mockResolvedValue({ status: "success", open_count: 0, remaining_seconds: 0, expired: true });

    const { result } = renderHook(() => usePhoneRegister());
    await act(async () => {
      await result.current.start("24K01234");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    act(() => result.current.reset());
    expect(result.current.phase).toBe("scan");
    expect(result.current.claim).toBeNull();
  });
});
