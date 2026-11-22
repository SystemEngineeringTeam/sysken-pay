import { SYSTEM_ACCOUNT_UPN } from "../config";
import { toAdminErrorMessage } from "../messages";
import { singleFlight } from "../save";
import { confirmDialog, h, messageBox, type ViewContext } from "../ui";
import type { AllowedAdmin } from "../api";

const formatDate = (iso: string): string => iso.slice(0, 10);

/** 管理者の許可リスト（Microsoft でログインできる人）。パスワードでも見られる */
export const adminsList = async (root: HTMLElement, { api }: ViewContext) => {
  const msg = messageBox();
  const list = h("ul", { class: "rows" });
  const upn = h("input", { type: "email", placeholder: "x24042xx@aitech.ac.jp", "aria-label": "許可する人の UPN", autocomplete: "off" });
  const addBtn = h("button", { type: "submit", class: "primary" }, "許可に追加");
  const form = h("form", { class: "row" }, upn, addBtn);
  root.append(
    h(
      "div",
      { class: "panel" },
      h("h2", {}, "管理者の許可"),
      h("p", { class: "note" }, "ここにいる人だけが Microsoft でログインできます。パスワードでのログインは、この一覧に関係なく使えます。"),
      form,
      msg.el,
      list,
    ),
  );

  let current: string | null = null;

  const render = (admins: AllowedAdmin[]) => {
    list.replaceChildren(
      ...(admins.length
        ? admins.map((a) => {
            const me = current !== null && a.upn === current;
            const locked = a.upn === SYSTEM_ACCOUNT_UPN; // システムアカウントは外せない
            const remove = h("button", { type: "button", class: "danger", disabled: me || locked, onclick: () => void removeOne(a.upn) }, "外す");
            return h(
              "li",
              { class: "row" },
              h("span", { class: "grow" }, a.upn, h("small", {}, ` ${a.student_id ?? "システムアカウント"}・${a.added_by}・${formatDate(a.created_at)}`)),
              me ? h("span", { class: "badge" }, "あなた") : null,
              remove,
            );
          })
        : [h("li", { class: "note" }, "まだ誰も許可されていません。")]),
    );
  };

  const load = async () => {
    try {
      const r = await api.listAdmins();
      current = r.current;
      render(r.admins);
    } catch (e) {
      msg.error(toAdminErrorMessage("list", e));
    }
  };

  const add = singleFlight(async () => {
    msg.clear();
    const value = upn.value.trim().toLowerCase();
    if (value === "") return;
    addBtn.disabled = true;
    try {
      await api.addAdmin(value);
      upn.value = "";
      msg.ok(`${value} を許可しました。`);
      await load();
    } catch (e) {
      msg.error(toAdminErrorMessage("add", e));
    } finally {
      addBtn.disabled = false;
    }
  });

  const removeOne = singleFlight(async (target: string) => {
    msg.clear();
    if (!(await confirmDialog(`${target} を許可リストから外します。この人は Microsoft でログインできなくなります。`, "外す", true))) return;
    try {
      await api.removeAdmin(target);
      msg.ok(`${target} を外しました。`);
      await load();
    } catch (e) {
      msg.error(toAdminErrorMessage("remove", e));
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void add();
  });
  await load();
};
