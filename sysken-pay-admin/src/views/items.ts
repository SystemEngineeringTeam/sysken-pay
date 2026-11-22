import type { ListedItem } from "../api";
import { parseItem } from "../form";
import { isValidJan, normalizeJan } from "../jan";
import { countItems, filterItems, ITEM_TABS, searchItems, sortItems, type ItemTab } from "../items";
import { toItemErrorMessage } from "../messages";
import { saveItem, singleFlight } from "../save";
import { startScanner, type Scanner } from "../scanner";
import { confirmDialog, errorText, h, messageBox, type ViewContext } from "../ui";

const yen = (n: number) => `${n.toLocaleString("ja-JP")} 円`;

export const itemsList = async (root: HTMLElement, { api }: ViewContext) => {
  const msg = messageBox();
  const list = h("ul", { class: "rows" });
  const search = h("input", { type: "search", placeholder: "商品名か JAN コードで探す", "aria-label": "商品を探す" });
  const tabs = h("div", { class: "tabs", role: "tablist" });
  root.append(
    h("div", { class: "panel" }, h("div", { class: "row" }, h("h2", {}, "商品"), h("a", { class: "button primary", href: "#/items/new" }, "カメラで登録")), tabs, search, msg.el, list),
  );
  let items: ListedItem[] = [];
  let tab: ItemTab = "enabled";
  const render = () => {
    const counts = countItems(items);
    tabs.replaceChildren(
      ...ITEM_TABS.map(({ key, label }) =>
        h("button", { type: "button", role: "tab", class: key === tab ? "tab active" : "tab", "aria-selected": String(key === tab), onclick: () => ((tab = key), render()) }, `${label} ${counts[key]}`),
      ),
    );
    const shown = sortItems(searchItems(filterItems(items, tab), search.value));
    list.replaceChildren(
      ...(shown.length
        ? shown.map((i) =>
            h("li", {}, h("a", { class: "row-link", href: `#/items/${encodeURIComponent(i.jan_code)}` }, h("span", { class: "grow" }, i.item_name), h("span", { class: "sub" }, i.disabled ? `無効 · ${yen(i.price)}` : yen(i.price)))),
          )
        : [h("li", { class: "note" }, tab === "disabled" ? "無効の商品はありません。" : "該当する商品はありません。")]),
    );
  };
  search.addEventListener("input", render);
  try {
    items = await api.listItems();
    render();
  } catch (e) {
    msg.error(errorText(e, "商品一覧を読み込めませんでした。もう一度お試しください。"));
  }
};

export const itemEdit = async (root: HTMLElement, { api }: ViewContext, jan: string) => {
  const msg = messageBox();
  const name = h("input", { required: true });
  const price = h("input", { inputmode: "numeric", required: true });
  const button = h("button", { type: "submit", class: "primary" }, "更新する");
  const status = h("p", { class: "note", hidden: true });
  const toggle = h("button", { type: "button", hidden: true }, "");
  const form = h(
    "form",
    { class: "panel", autocomplete: "off" },
    h("h2", {}, "商品の更新"),
    h("p", { class: "note" }, `JAN コード：${jan}（変えられません）`),
    status,
    h("label", {}, "商品名"),
    name,
    h("label", {}, "値段（円）"),
    price,
    button,
    toggle,
    msg.el,
    h("a", { class: "back", href: "#/items" }, "← 商品の一覧へ"),
  );
  root.append(form);
  let disabled = false;
  const showState = () => {
    status.hidden = !disabled;
    status.textContent = "この商品は無効です。ラズパイでは買えません。";
    toggle.hidden = false;
    toggle.textContent = disabled ? "有効にする" : "無効にする";
    toggle.className = disabled ? "primary" : "danger";
  };
  try {
    const found = await api.getItem(jan);
    if (!found) {
      msg.error("この商品は登録されていません。");
      button.disabled = true;
      return;
    }
    name.value = found.item_name;
    price.value = String(found.price);
    disabled = found.disabled;
    showState();
  } catch (e) {
    msg.error(errorText(e, "商品を読み込めませんでした。"));
    button.disabled = true;
    return;
  }
  const save = singleFlight(async () => {
    msg.clear();
    const parsed = parseItem({ jan, name: name.value, price: price.value });
    if (!parsed.ok) return msg.error(parsed.message);
    button.disabled = true;
    try {
      await api.update(parsed.item);
      msg.ok(`更新しました：${parsed.item.item_name}（${yen(parsed.item.price)}）`);
    } catch (e) {
      msg.error(errorText(e, "更新できませんでした。もう一度お試しください。"));
    } finally {
      button.disabled = false;
    }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void save();
  });
  const flip = singleFlight(async () => {
    msg.clear();
    const next = !disabled;
    if (next && !(await confirmDialog("この商品を無効にします。ラズパイでは買えなくなります（商品は消えません。あとから有効に戻せます）。", "無効にする", true))) return;
    toggle.disabled = true;
    try {
      await (next ? api.disableItem(jan) : api.enableItem(jan));
      disabled = next;
      showState();
      msg.ok(next ? "無効にしました。" : "有効にしました。ラズパイで買えます。");
    } catch (e) {
      msg.error(toItemErrorMessage(next ? "disable" : "enable", e));
    } finally {
      toggle.disabled = false;
    }
  });
  toggle.addEventListener("click", () => void flip());
};

export const itemRegister = (root: HTMLElement, { api, onLeave }: ViewContext) => {
  const cameraMsg = messageBox();
  const msg = messageBox();
  const video = h("video", { class: "video", muted: true, playsinline: true, hidden: true });
  const toggle = h("button", { type: "button", class: "primary" }, "カメラを開始");
  const jan = h("input", { inputmode: "numeric", maxlength: "13", required: true });
  const name = h("input", { required: true });
  const price = h("input", { inputmode: "numeric", required: true });
  const existing = h("p", { class: "note existing", hidden: true });
  const enable = h("button", { type: "button", class: "primary", hidden: true }, "有効にする");
  const save = h("button", { type: "submit", class: "primary" }, "登録する");
  const form = h(
    "form",
    { class: "panel", autocomplete: "off" },
    h("h2", {}, "2. 商品の情報"),
    h("label", {}, "JAN コード"),
    jan,
    existing,
    enable,
    h("label", {}, "商品名"),
    name,
    h("label", {}, "値段（円）"),
    price,
    save,
    msg.el,
  );
  root.append(
    h("div", { class: "panel" }, h("h2", {}, "1. バーコードを読む"), video, toggle, cameraMsg.el, h("p", { class: "note" }, "読めないときは、下の JAN コード欄に手で入力してもかまいません。")),
    form,
    h("a", { class: "back", href: "#/items" }, "← 商品の一覧へ"),
  );

  let scanner: Scanner | null = null;
  let seq = 0;
  const stopCamera = () => {
    scanner?.stop();
    scanner = null;
    video.hidden = true;
    toggle.textContent = "カメラを開始";
  };
  onLeave(stopCamera);

  // 無効の商品は、有効にするまで保存させない
  let blocked = false;
  const setBlocked = (b: boolean) => {
    blocked = b;
    enable.hidden = !b;
    save.disabled = b;
  };

  const lookup = async (code: string) => {
    existing.hidden = true;
    setBlocked(false);
    if (!isValidJan(code)) return;
    const mine = ++seq;
    try {
      const found = await api.getItem(code);
      if (mine !== seq) return;
      if (found) {
        name.value = found.item_name;
        price.value = String(found.price);
        existing.textContent = found.disabled
          ? "この商品は無効になっています。有効にしますか？（有効にするまで、ラズパイでは買えません）"
          : "登録済みの商品です。保存すると、名前と値段が更新されます。";
        existing.hidden = false;
        setBlocked(found.disabled);
      } else name.focus();
    } catch (e) {
      if (mine === seq) msg.error(errorText(e, "商品を調べられませんでした。"));
    }
  };

  toggle.addEventListener("click", async () => {
    cameraMsg.clear();
    if (scanner) return stopCamera();
    video.hidden = false;
    try {
      scanner = await startScanner(video, (code) => {
        if (jan.value === code) return;
        jan.value = code;
        msg.clear();
        void lookup(code);
      });
      toggle.textContent = "カメラを止める";
    } catch {
      video.hidden = true;
      cameraMsg.error("カメラを開けませんでした。ブラウザのカメラの許可を確かめてください。");
    }
  });
  jan.addEventListener("input", () => {
    msg.clear();
    void lookup(normalizeJan(jan.value));
  });

  const doEnable = singleFlight(async () => {
    msg.clear();
    const code = normalizeJan(jan.value);
    enable.disabled = true;
    try {
      await api.enableItem(code);
      setBlocked(false);
      existing.textContent = "有効にしました。登録済みの商品です。保存すると、名前と値段が更新されます。";
      msg.ok("有効にしました。ラズパイで買えます。");
    } catch (e) {
      msg.error(toItemErrorMessage("enable", e));
    } finally {
      enable.disabled = false;
    }
  });
  enable.addEventListener("click", () => void doEnable());

  const submit = singleFlight(async () => {
    msg.clear();
    if (blocked) return msg.error("この商品は無効です。先に「有効にする」を押してください。");
    const parsed = parseItem({ jan: jan.value, name: name.value, price: price.value });
    if (!parsed.ok) return msg.error(parsed.message);
    save.disabled = true;
    try {
      const r = await saveItem(api, parsed.item);
      for (const el of [jan, name, price]) el.value = "";
      existing.hidden = true;
      msg.ok(`${r === "created" ? "登録しました" : "更新しました"}：${parsed.item.item_name}（${yen(parsed.item.price)}）`);
    } catch (e) {
      msg.error(errorText(e, "保存できませんでした。もう一度お試しください。"));
    } finally {
      save.disabled = blocked;
    }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void submit();
  });
};
