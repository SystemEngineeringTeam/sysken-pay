// 画面を組み立てる小さな道具。文字は必ず textContent で入れる（innerHTML は使わない）。
import { ApiError } from "./api";

type Child = Node | string | null | false | undefined;
type Props = { class?: string; type?: string; disabled?: boolean; hidden?: boolean; href?: string; onclick?: (e: MouseEvent) => void } & Record<string, unknown>;

export const h = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === false) continue;
    if (k === "onclick") el.addEventListener("click", v as EventListener);
    else if (k === "class") el.className = String(v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c) el.append(c);
  return el;
};

/** 確認ダイアログ。OK なら true */
export const confirmDialog = (message: string, okLabel: string, danger = false): Promise<boolean> =>
  new Promise((resolve) => {
    const dialog = h("dialog", { class: "confirm" });
    const done = (ok: boolean) => {
      dialog.close();
      dialog.remove();
      resolve(ok);
    };
    const ok = h("button", { type: "button", class: danger ? "danger" : "primary", onclick: () => done(true) }, okLabel);
    const cancel = h("button", { type: "button", class: "secondary", onclick: () => done(false) }, "やめる");
    dialog.append(h("p", { class: "confirm-message" }, message), h("div", { class: "row" }, cancel, ok));
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      done(false);
    });
    document.body.append(dialog);
    dialog.showModal();
    cancel.focus(); // 誤って Enter で実行しないよう、「やめる」に合わせる
  });

export const errorText = (e: unknown, fallback: string): string => (e instanceof ApiError ? e.message : fallback);

/** 結果・エラーを出す欄 */
export const messageBox = () => {
  const el = h("p", { role: "status", hidden: true });
  return {
    el,
    ok(text: string) {
      el.className = "result";
      el.setAttribute("role", "status");
      el.textContent = text;
      el.hidden = false;
    },
    error(text: string) {
      el.className = "error-message";
      el.setAttribute("role", "alert");
      el.textContent = text;
      el.hidden = false;
    },
    clear() {
      el.hidden = true;
      el.textContent = "";
    },
  };
};

export type ViewContext = {
  api: import("./api").Api;
  /** 画面を離れるときに呼ぶ後始末を登録する（カメラ・タイマー・QR の消去） */
  onLeave: (fn: () => void) => void;
  /** 学籍番号（X24042）から氏名を Graph で引く。Microsoft でログインしていないときは undefined。引けなければ null */
  lookupName?: (studentId: string) => Promise<string | null>;
};
