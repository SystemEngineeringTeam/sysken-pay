// Microsoft Graph（ユーザー委任）。呼ぶのは PC の管理サイトだけ（ラズパイのフロントには入れない）。
import { GRAPH_BASE } from "./config";

type Fetch = typeof fetch;

/** 写真の最大サイズ。大きすぎるものは使わない */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/**
 * ログインしている本人のプロフィール画像（GET /me/photo/$value）。
 * 写真がない（404）・権限がない・つながらないときは null（イニシャルの表示にする）。
 */
export const fetchMyPhoto = async (token: string, fetchFn: Fetch = (...a) => fetch(...a), base: string = GRAPH_BASE): Promise<Blob | null> => {
  try {
    const res = await fetchFn(`${base}/me/photo/$value`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size === 0 || blob.size > MAX_PHOTO_BYTES) return null;
    // 画像以外（想定外の応答）は使わない
    return blob.type.startsWith("image/") ? blob : null;
  } catch {
    return null;
  }
};

/** 名前のイニシャル（写真がないときの丸に出す 1 文字） */
export const initialOf = (name: string): string => (name.trim().charAt(0) || "?").toUpperCase();
