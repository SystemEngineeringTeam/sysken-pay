/** 購入 API のエラーを、画面に出す日本語のメッセージにする */
export const toPurchaseErrorMessage = (e: unknown): string => {
  const message = e instanceof Error ? e.message : "";
  if (message === "insufficient balance") {
    // 画面を開いた後に残高が変わった場合など、サーバー側で残高不足と判定されたとき
    return "残高が不足しています。残高を確認してください";
  }
  if (message === "item not found") {
    return "登録されていない商品が含まれています";
  }
  return "購入に失敗しました";
};
