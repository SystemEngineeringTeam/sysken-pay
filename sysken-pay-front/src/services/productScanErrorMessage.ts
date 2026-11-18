import { ApiError } from "../adapter/api/ApiError";

export const PRODUCT_NOT_REGISTERED = "登録されていない商品です。担当者にご連絡ください。";

/** 商品のバーコードを読み取ったときのエラーを、画面に出す日本語のメッセージにする */
export const toProductScanErrorMessage = (e: unknown): string => {
  if (e instanceof ApiError) {
    if (e.status === 404) return PRODUCT_NOT_REGISTERED;
    if (e.status === 400) return "商品のバーコードを読み取れませんでした。もう一度かざしてください。";
  }
  return "商品の取得に失敗しました。もう一度かざしてください。";
};
