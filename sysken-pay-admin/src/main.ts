// 商品を PC のカメラで読んで、JAN・名前・値段を、内部アドレスのバックエンドに登録する管理画面。
// パスワードはこのページのメモリにだけ置く（保存しない・URL に入れない）。通信先は config.ts の内部アドレスだけ。
import { type Api, ApiError, createApi } from "./api";
import { API_TARGETS, baseOf, loadTarget, parseTargetId, saveTarget } from "./config";
import { parseItem } from "./form";
import { normalizeJan, isValidJan } from "./jan";
import { saveItem, singleFlight } from "./save";
import { type Scanner, startScanner } from "./scanner";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const setText = (id: string, text: string | null) => {
  const el = $(id);
  el.textContent = text ?? "";
  el.hidden = text === null;
};
const messageOf = (e: unknown): string => (e instanceof ApiError ? e.message : "うまくいきませんでした。もう一度試してください。");

let api: Api | null = null;
let scanner: Scanner | null = null;
let lookupSeq = 0;

// ---- ログイン ----
const login = singleFlight(async () => {
  setText("login-error", null);
  const target = parseTargetId($<HTMLSelectElement>("api-target").value);
  if (!target) return;
  const base = baseOf(target);
  const candidate = createApi($<HTMLInputElement>("password").value, undefined, base);
  try {
    await candidate.verify();
  } catch (e) {
    setText("login-error", messageOf(e));
    return;
  }
  api = candidate;
  saveTarget(target);
  $<HTMLInputElement>("password").value = "";
  $("login").hidden = true;
  $("app").hidden = false;
  $("logout").hidden = false;
});

const logout = () => {
  stopCamera();
  api = null;
  $("app").hidden = true;
  $("logout").hidden = true;
  $("login").hidden = false;
  resetForm();
};

// ---- カメラ ----
const stopCamera = () => {
  scanner?.stop();
  scanner = null;
  $<HTMLVideoElement>("video").hidden = true;
  $("camera-toggle").textContent = "カメラを開始";
};

const toggleCamera = async () => {
  setText("camera-error", null);
  if (scanner) return stopCamera();
  const video = $<HTMLVideoElement>("video");
  video.hidden = false;
  try {
    scanner = await startScanner(video, (jan) => void onScan(jan));
    $("camera-toggle").textContent = "カメラを止める";
  } catch {
    video.hidden = true;
    setText("camera-error", "カメラを開けませんでした。ブラウザのカメラの許可を確かめてください。");
  }
};

// ---- 入力欄 ----
const resetForm = () => {
  for (const id of ["jan", "name", "price"]) $<HTMLInputElement>(id).value = "";
  setText("existing", null);
  setText("form-error", null);
};

// JAN が決まったら、登録済みか調べて、あれば名前と値段を入れる（保存すると更新になる）
const onScan = async (jan: string) => {
  const input = $<HTMLInputElement>("jan");
  if (input.value === jan) return; // 同じバーコードを読み続けているときは何もしない
  input.value = jan;
  setResultCleared();
  await lookup(jan);
};

const lookup = async (jan: string) => {
  setText("existing", null);
  if (!api || !isValidJan(jan)) return;
  const seq = ++lookupSeq;
  try {
    const found = await api.getItem(jan);
    if (seq !== lookupSeq) return; // 別の JAN に変わっていたら捨てる
    if (found) {
      $<HTMLInputElement>("name").value = found.item_name;
      $<HTMLInputElement>("price").value = String(found.price);
      setText("existing", "登録済みの商品です。保存すると、名前と値段が更新されます。");
    } else {
      $<HTMLInputElement>("name").focus();
    }
  } catch (e) {
    if (seq === lookupSeq) setText("form-error", messageOf(e));
  }
};

const setResultCleared = () => {
  setText("result", null);
  setText("form-error", null);
};

// ---- 保存 ----
const save = singleFlight(async () => {
  setResultCleared();
  if (!api) return;
  const parsed = parseItem({
    jan: $<HTMLInputElement>("jan").value,
    name: $<HTMLInputElement>("name").value,
    price: $<HTMLInputElement>("price").value,
  });
  if (!parsed.ok) {
    setText("form-error", parsed.message);
    return;
  }
  const button = $<HTMLButtonElement>("save");
  button.disabled = true;
  try {
    const r = await saveItem(api, parsed.item);
    const { item_name, price } = parsed.item;
    resetForm();
    setText("result", `${r === "created" ? "登録しました" : "更新しました"}：${item_name}（${price} 円）`);
  } catch (e) {
    setText("form-error", messageOf(e));
  } finally {
    button.disabled = false;
  }
});

const targetSelect = $<HTMLSelectElement>("api-target");
for (const t of API_TARGETS) targetSelect.add(new Option(t.label, t.id));
targetSelect.value = loadTarget();
$("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  void login();
});
$("logout").addEventListener("click", logout);
$("camera-toggle").addEventListener("click", () => void toggleCamera());
$("item-form").addEventListener("submit", (e) => {
  e.preventDefault();
  void save();
});
// 手入力でも、13桁・8桁そろったら登録済みか調べる
$<HTMLInputElement>("jan").addEventListener("input", (e) => {
  const jan = normalizeJan((e.target as HTMLInputElement).value);
  setResultCleared();
  void lookup(jan);
});
