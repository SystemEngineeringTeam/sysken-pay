import { describe, expect, it, vi } from "vitest";
import { fetchMyPhoto, initialOf, MAX_PHOTO_BYTES } from "./graph";

const img = (type = "image/jpeg", size = 10) => new Response(new Blob([new Uint8Array(size)], { type }), { status: 200 });

describe("fetchMyPhoto", () => {
  it("Bearer 付きで /me/photo/$value を呼び、画像を返す", async () => {
    const f = vi.fn().mockResolvedValue(img());
    const b = await fetchMyPhoto("tok", f, "https://g");
    expect(b?.type).toBe("image/jpeg");
    expect(f).toHaveBeenCalledWith("https://g/me/photo/$value", { headers: { Authorization: "Bearer tok" } });
  });
  it("写真なし（404）・通信失敗は null", async () => {
    expect(await fetchMyPhoto("t", vi.fn().mockResolvedValue(new Response(null, { status: 404 })))).toBeNull();
    expect(await fetchMyPhoto("t", vi.fn().mockRejectedValue(new TypeError("x")))).toBeNull();
  });
  it("空・大きすぎる・画像でないものは使わない", async () => {
    expect(await fetchMyPhoto("t", vi.fn().mockResolvedValue(img("image/png", 0)))).toBeNull();
    expect(await fetchMyPhoto("t", vi.fn().mockResolvedValue(img("image/png", MAX_PHOTO_BYTES + 1)))).toBeNull();
    expect(await fetchMyPhoto("t", vi.fn().mockResolvedValue(img("text/html")))).toBeNull();
  });
});

describe("initialOf", () => {
  it("先頭の 1 文字（英字は大文字）。空なら ?", () => {
    expect(initialOf("  さな")).toBe("さ");
    expect(initialOf("sana")).toBe("S");
    expect(initialOf("")).toBe("?");
  });
});
