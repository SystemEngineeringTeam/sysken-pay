import QRCode from "qrcode";
import { stopMember, stopMembers } from "../actions";
import { countMembers, filterMembers, formatYen, MEMBER_TABS, memberBadge, searchMembers, type Member, type MemberTab } from "../members";
import { isValidStudentId, toMemberErrorMessage, type MemberAction } from "../messages";
import { buildQrUrl, formatRemaining, QR_DISPLAY_SECONDS, QR_ENDPOINT } from "../qr";
import { singleFlight } from "../save";
import { confirmDialog, h, messageBox, type ViewContext } from "../ui";

const userHref = (id: string) => `#/users/${encodeURIComponent(id)}`;

const badge = (m: Member) => {
  const b = memberBadge(m);
  return b ? h("span", { class: `badge ${b.tone}` }, b.label) : null;
};

export const usersList = async (root: HTMLElement, { api }: ViewContext) => {
  const msg = messageBox();
  const tabs = h("div", { class: "tabs", role: "tablist" });
  const search = h("input", { type: "search", placeholder: "名前か学籍番号で探す", "aria-label": "ユーザーを探す" });
  const list = h("ul", { class: "rows" });
  const batch = h("div", { hidden: true });
  root.append(h("div", { class: "panel" }, h("h2", {}, "ユーザー"), tabs, search, batch, msg.el, list));

  let members: Member[] = [];
  let tab: MemberTab = "all";

  const render = () => {
    const counts = countMembers(members);
    const allTabs: { key: MemberTab; label: string }[] = [
      ...MEMBER_TABS,
      { key: "stopped", label: "停止中" },
    ];
    tabs.replaceChildren(
      ...allTabs.map(({ key, label }) =>
        h("button", { type: "button", role: "tab", class: key === tab ? "tab active" : "tab", "aria-selected": String(key === tab), onclick: () => ((tab = key), render()) }, `${label} ${counts[key]}`),
      ),
    );
    const shown = searchMembers(filterMembers(members, tab), search.value);
    list.replaceChildren(
      ...(shown.length
        ? shown.map((m) =>
            h("li", {}, h("a", { class: "row-link", href: userHref(m.user_id) }, h("span", { class: "grow" }, `${m.user_name}`, h("small", {}, ` ${m.user_id}`)), badge(m), h("span", { class: "sub" }, formatYen(m.balance)))),
          )
        : [h("li", { class: "note" }, "該当するユーザーはいません。")]),
    );
    // 卒業候補のまとめて利用停止（返金はしない。確認ダイアログを必ず挟む）
    batch.hidden = tab !== "graduation" || counts.graduation === 0;
    batch.replaceChildren(
      h("button", { type: "button", class: "danger", onclick: () => void stopAll() }, `卒業候補 ${counts.graduation} 人をまとめて利用停止`),
      h("p", { class: "note" }, "返金はしません。残高のある人は「未返金」に入ります。"),
    );
  };

  const load = async () => {
    try {
      members = await api.listUsers();
      render();
    } catch (e) {
      msg.error(toMemberErrorMessage("list", e));
    }
  };

  const stopAll = singleFlight(async () => {
    msg.clear();
    const targets = filterMembers(members, "graduation");
    if (!(await confirmDialog(`卒業候補の ${targets.length} 人を利用停止します。利用停止した人は購入もチャージもできなくなります（あとから再開できます）。`, "利用停止する", true))) return;
    batch.querySelectorAll("button").forEach((b) => (b.disabled = true));
    const r = await stopMembers(api, targets.map((m) => m.user_id));
    await load();
    if (r.failed.length) msg.error(`${r.stopped.length} 人を利用停止しました。${r.failed.length} 人は失敗しました（${r.failed.join("、")}）。もう一度お試しください。`);
    else msg.ok(`${r.stopped.length} 人を利用停止しました。`);
  });

  search.addEventListener("input", render);
  await load();
};

export const userDetail = async (root: HTMLElement, { api }: ViewContext, userId: string) => {
  const msg = messageBox();
  const panel = h("div", { class: "panel" });
  root.append(panel, h("a", { class: "back", href: "#/users" }, "← ユーザーの一覧へ"));

  const load = async () => {
    let m: Member | undefined;
    try {
      m = (await api.listUsers()).find((u) => u.user_id === userId);
    } catch (e) {
      panel.replaceChildren(msg.el);
      msg.error(toMemberErrorMessage("list", e));
      return;
    }
    if (!m) {
      panel.replaceChildren(msg.el);
      msg.error("このユーザーは登録されていません。一覧を読み込み直してください。");
      return;
    }
    draw(m);
  };

  const draw = (m: Member) => {
    const buttons: HTMLButtonElement[] = [];
    // 実行中は全ボタンを無効にし、二重送信を防ぐ
    const action = (label: string, kind: MemberAction, fn: () => Promise<string | null>, cls = "secondary", enabled = true) => {
      const run = singleFlight(async () => {
        msg.clear();
        buttons.forEach((b) => (b.disabled = true));
        try {
          const text = await fn();
          if (text === null) return;
          await load();
          msg.ok(text);
        } catch (e) {
          msg.error(toMemberErrorMessage(kind, e));
        } finally {
          buttons.forEach((b) => (b.disabled = false));
        }
      });
      const b = h("button", { type: "button", class: cls, disabled: !enabled, onclick: () => void run() }, label);
      buttons.push(b);
      return b;
    };

    const active = m.status === "active";
    const rows: (HTMLElement | null)[] = [];
    if (m.balance > 0)
      rows.push(
        action(`${formatYen(m.balance)} を返金する`, "refund", async () => {
          if (!(await confirmDialog(`${m.user_name} さんに ${formatYen(m.balance)} を返金します。返金したら、現金を渡してください。`, "返金する", true))) return null;
          return `${formatYen(await api.refund(m.user_id))} を返金しました。現金を渡してください。`;
        }, "danger"),
      );
    if (active) {
      rows.push(
        action("利用停止する", "stop", async () => {
          const note = m.balance > 0 ? `残高 ${formatYen(m.balance)} は残ります（「未返金」に入ります）。` : "";
          if (!(await confirmDialog(`${m.user_name} さんを利用停止します。購入もチャージもできなくなります。${note}`, "利用停止する", true))) return null;
          const r = await stopMember(api, m.user_id, false);
          return r.remaining > 0 ? `利用停止しました。残高 ${formatYen(r.remaining)} が残っています。` : "利用停止しました。";
        }),
      );
      if (m.balance > 0)
        rows.push(
          action("返金して利用停止する", "stop", async () => {
            if (!(await confirmDialog(`${m.user_name} さんに ${formatYen(m.balance)} を返金して、利用停止します。返金したら、現金を渡してください。`, "返金して利用停止", true))) return null;
            const r = await stopMember(api, m.user_id, true);
            return `${formatYen(r.refunded)} を返金して、利用停止しました。現金を渡してください。`;
          }, "danger"),
        );
    } else {
      rows.push(action("利用を再開する", "resume", async () => (await api.resume(m.user_id), "利用を再開しました。"), "primary"));
    }
    // 削除は取り消せないので、他の操作から離して一番下に置く
    const removeButtons: HTMLElement[] = [];
    if (m.deletable)
      removeButtons.push(
        action("削除する", "delete", async () => {
          if (!(await confirmDialog(`${m.user_name}（${m.user_id}）を削除します。取り消せません。`, "削除する", true))) return null;
          await api.remove(m.user_id);
          location.hash = "#/users";
          return null;
        }, "danger"),
      );

    panel.replaceChildren(
      h("h2", {}, m.user_name),
      h("p", { class: "note" }, `学籍番号：${m.user_id}`),
      h("p", {}, `残高：${formatYen(m.balance)} `, badge(m)),
      h("div", { class: "actions" }, ...rows),
      h("div", { class: "actions" }, h("a", { class: "button secondary", href: `${userHref(m.user_id)}/edit` }, "名前・学籍番号を直す"), active ? h("a", { class: "button secondary", href: `${userHref(m.user_id)}/issue` }, m.has_payment_card ? "バーコードを再発行" : "バーコードを発行") : null),
      ...(removeButtons.length > 0 ? [h("div", { class: "actions danger-zone" }, ...removeButtons)] : []),
      msg.el,
    );
  };

  await load();
};

export const userEdit = async (root: HTMLElement, { api }: ViewContext, userId: string) => {
  const msg = messageBox();
  const name = h("input", { required: true });
  const id = h("input", { required: true, maxlength: "20" });
  const button = h("button", { type: "submit", class: "primary" }, "保存する");
  const form = h(
    "form",
    { class: "panel", autocomplete: "off" },
    h("h2", {}, "名前・学籍番号を直す"),
    h("label", {}, "名前"),
    name,
    h("label", {}, "学籍番号"),
    id,
    button,
    msg.el,
  );
  root.append(form, h("a", { class: "back", href: userHref(userId) }, "← 詳細へ"));
  let current = userId;
  try {
    const m = (await api.listUsers()).find((u) => u.user_id === userId);
    if (!m) throw new Error("not found");
    name.value = m.user_name;
    id.value = m.user_id;
  } catch (e) {
    msg.error(toMemberErrorMessage("list", e));
    button.disabled = true;
    return;
  }
  const save = singleFlight(async () => {
    msg.clear();
    const newName = name.value.trim();
    const newId = id.value.trim();
    if (!newName) return msg.error("名前を入力してください。");
    if (!isValidStudentId(newId)) return msg.error("学籍番号は「24K01234」の形で入れてください。");
    button.disabled = true;
    try {
      const r = await api.updateUser(current, { user_name: newName, ...(newId !== current ? { user_id: newId } : {}) });
      current = r.user_id;
      name.value = r.user_name;
      id.value = r.user_id;
      msg.ok("更新しました。");
    } catch (e) {
      msg.error(toMemberErrorMessage("update", e));
    } finally {
      button.disabled = false;
    }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void save();
  });
};

export const userIssue = (root: HTMLElement, { api, onLeave }: ViewContext, userId: string) => {
  const msg = messageBox();
  const stage = h("div", {});
  const start = h("button", { type: "button", class: "primary" }, "発行して QR を出す");
  root.append(
    h(
      "div",
      { class: "panel" },
      h("h2", {}, "支払い用バーコードの発行"),
      h("p", {}, "本人のスマホで QR を読んでもらいます。発行すると、これまでのバーコードは使えなくなります。QR は 2 分で消えます。他の人に見えないようにしてください。"),
      start,
      stage,
      msg.el,
    ),
    h("a", { class: "back", href: userHref(userId) }, "← 詳細へ"),
  );

  let timer: number | undefined;
  const clearQr = () => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
    stage.replaceChildren();
  };
  onLeave(clearQr);

  const issue = singleFlight(async () => {
    msg.clear();
    clearQr();
    // 発行すると古いバーコードが死ぬので、QR の行き先が正しくないときは発行より先に断る
    let valid = false;
    try {
      valid = new URL(QR_ENDPOINT).protocol === "https:";
    } catch {
      /* 不正 */
    }
    if (!valid) return msg.error("QR の行き先が正しくないため、発行しませんでした。");
    if (!(await confirmDialog("発行すると、いまのバーコードは使えなくなります。発行しますか？", "発行する", true))) return;
    start.disabled = true;
    try {
      const { hri, user_name } = await api.issueHri(userId);
      const dataUrl = await QRCode.toDataURL(buildQrUrl(QR_ENDPOINT, hri), { margin: 2, width: 280 });
      const remain = h("p", { class: "note" });
      let left = QR_DISPLAY_SECONDS;
      const tick = () => {
        if (left <= 0) {
          clearQr();
          msg.ok("時間が過ぎたので QR を消しました。もう一度出すには、発行し直してください。");
          return;
        }
        remain.textContent = `あと ${formatRemaining(left)} で消えます`;
        left -= 1;
      };
      stage.replaceChildren(h("p", {}, `${user_name} さんのバーコード`), h("img", { class: "qr", src: dataUrl, alt: "支払い用バーコードの QR", width: "280", height: "280" }), remain);
      tick();
      timer = window.setInterval(tick, 1000);
    } catch (e) {
      msg.error(toMemberErrorMessage("issue", e));
    } finally {
      start.disabled = false;
    }
  });
  start.addEventListener("click", () => void issue());
};
