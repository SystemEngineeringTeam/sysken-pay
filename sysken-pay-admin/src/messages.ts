// API のエラーを、画面に出す日本語のメッセージにする。
import { ApiError } from "./api";

const SESSION = "管理者パスワードの確認が切れました。ログインし直してください。";

export type MemberAction = "list" | "refund" | "stop" | "resume" | "hide" | "unhide" | "delete" | "update" | "issue" | "register";

const FALLBACK: Record<MemberAction, string> = {
  list: "ユーザー一覧を読み込めませんでした。もう一度お試しください。",
  refund: "返金できませんでした。もう一度お試しください。",
  stop: "利用停止できませんでした。もう一度お試しください。",
  resume: "利用を再開できませんでした。もう一度お試しください。",
  hide: "非表示にできませんでした。もう一度お試しください。",
  unhide: "非表示をやめられませんでした。もう一度お試しください。",
  delete: "削除できませんでした。もう一度お試しください。",
  update: "更新に失敗しました。もう一度お試しください。",
  issue: "QR を作れませんでした。もう一度お試しください。",
  register: "登録できませんでした。もう一度お試しください。",
};

export const toMemberErrorMessage = (action: MemberAction, e: unknown): string => {
  if (e instanceof ApiError) {
    if (e.kind === "network" || e.kind === "unauthorized") return e.kind === "unauthorized" ? SESSION : e.message;
    switch (e.status) {
      case 400:
        if (action === "register") return "学籍番号か名前の形が正しくありません。";
        if (action === "update") return "学籍番号か名前の形が正しくありません。学籍番号は「24K01234」の形で入れてください。";
        break;
      case 403:
        if (action === "issue") return "このユーザーは利用停止しています。「ユーザー一覧」から「利用を再開」してください。";
        break;
      case 404:
        if (action === "register") break;
        return "このユーザーは登録されていません。一覧を読み込み直してください。";
      case 409:
        if (action === "refund") return "残高が 0 円なので、返金するものはありません。";
        if (action === "stop") return "このユーザーは、すでに利用停止しています。";
        if (action === "resume") return "このユーザーは利用停止していません。";
        if (action === "hide") return "非表示にできるのは、利用停止中で残高が 0 円の人だけです。残高が残っているときは先に返金してください。";
        if (action === "unhide") return "このユーザーは非表示になっていません。";
        if (action === "delete") return "購入・チャージ・返金の記録がある人は削除できません。利用停止のままにしてください。";
        if (action === "update" || action === "register") return "この学籍番号は、もう別のユーザーで登録されています。";
        break;
    }
  }
  return FALLBACK[action];
};

export type ItemAction = "disable" | "enable";

/** 商品を無効にする・有効に戻すときのエラー */
export const toItemErrorMessage = (action: ItemAction, e: unknown): string => {
  if (e instanceof ApiError) {
    if (e.kind === "unauthorized") return SESSION;
    if (e.kind === "network") return e.message;
    if (e.status === 404) return "この商品は登録されていません。一覧を読み込み直してください。";
    if (e.status === 409) return action === "disable" ? "この商品は、すでに無効です。" : "この商品は無効になっていません。";
  }
  return action === "disable" ? "無効にできませんでした。もう一度お試しください。" : "有効にできませんでした。もう一度お試しください。";
};

/** 学籍番号の形（例: 24K01234）。サーバーと同じ決まり */
const STUDENT_ID = /^\d{2}[A-Za-z]\d+$/;

export const isValidStudentId = (id: string): boolean => {
  const v = id.trim();
  return v.length <= 20 && STUDENT_ID.test(v);
};

export type AdminAction = "list" | "add" | "remove";

/** 管理者の許可リストを読む・足す・外すときのエラー */
export const toAdminErrorMessage = (action: AdminAction, e: unknown): string => {
  if (e instanceof ApiError) {
    if (e.kind === "unauthorized") return SESSION;
    if (e.kind === "network") return e.message;
    if (e.status === 400 && action === "add") return "UPN の形が正しくありません（例: x24042xx@aitech.ac.jp）。";
    if (e.status === 404 && action === "remove") return "この人はすでに許可リストにいません。一覧を読み込み直してください。";
    if (e.status === 409) {
      if (action === "add") return "この人は、すでに許可されています。";
      if (action === "remove") return "システムアカウント、最後の 1 人、いまログインしている自分自身は外せません。";
    }
  }
  return { list: "許可リストを読み込めませんでした。もう一度お試しください。", add: "許可に追加できませんでした。もう一度お試しください。", remove: "外せませんでした。もう一度お試しください。" }[action];
};
