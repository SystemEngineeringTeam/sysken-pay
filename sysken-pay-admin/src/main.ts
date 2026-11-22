// 管理画面（商品・ユーザー）。パスワードは、リロードしてもログインしたままにするため、このタブの sessionStorage に置く
// （タブを閉じると消える。localStorage には置かない・URL に入れない）。
// 通信先は config.ts の内部アドレスだけ。画面は URL のハッシュで切り替える（route.ts）。
import { type Api, ApiError, createApi } from "./api";
import { API_TARGETS, baseOf, loadTarget, parseTargetId, saveTarget } from "./config";
import { parseRoute, sectionOf } from "./route";
import { singleFlight } from "./save";
import { clearSession, loadSession, saveSession } from "./session";
import { h, type ViewContext } from "./ui";
import { itemEdit, itemRegister, itemsList } from "./views/items";
import { userDetail, userEdit, userIssue, usersList } from "./views/users";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let api: Api | null = null;
const leave: (() => void)[] = [];

const runLeave = () => {
  for (const fn of leave.splice(0)) fn();
};

const render = async () => {
  runLeave(); // カメラ・タイマー・QR を片づける
  const view = $("view");
  view.replaceChildren();
  if (!api) return;
  const route = parseRoute(location.hash);
  const section = sectionOf(route);
  $("nav-items").classList.toggle("active", section === "items");
  $("nav-users").classList.toggle("active", section === "users");
  const ctx: ViewContext = { api, onLeave: (fn) => void leave.push(fn) };
  const root = h("div");
  view.append(root);
  switch (route.name) {
    case "items":
      return itemsList(root, ctx);
    case "itemNew":
      return itemRegister(root, ctx);
    case "item":
      return itemEdit(root, ctx, route.jan);
    case "users":
      return usersList(root, ctx);
    case "user":
      return userDetail(root, ctx, route.id);
    case "userEdit":
      return userEdit(root, ctx, route.id);
    case "userIssue":
      return userIssue(root, ctx, route.id);
  }
};

const showLogin = (on: boolean) => {
  $("login").hidden = !on;
  $("view").hidden = on;
  $("nav").hidden = on;
  $("logout").hidden = on;
};

const loginError = (text: string | null) => {
  const el = $("login-error");
  el.textContent = text ?? "";
  el.hidden = text === null;
};

const login = singleFlight(async () => {
  loginError(null);
  const target = parseTargetId($<HTMLSelectElement>("api-target").value);
  if (!target) return;
  const password = $<HTMLInputElement>("password").value;
  const candidate = createApi(password, undefined, baseOf(target));
  try {
    await candidate.verify();
  } catch (e) {
    loginError(e instanceof ApiError ? e.message : "うまくいきませんでした。もう一度試してください。");
    return;
  }
  api = candidate;
  saveSession(password);
  saveTarget(target);
  $<HTMLInputElement>("password").value = "";
  showLogin(false);
  await render();
});

const logout = () => {
  runLeave();
  api = null;
  clearSession();
  $("view").replaceChildren();
  location.hash = "";
  showLogin(true);
};

const targetSelect = $<HTMLSelectElement>("api-target");
for (const t of API_TARGETS) targetSelect.add(new Option(t.label, t.id));
targetSelect.value = loadTarget();
$("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  void login();
});
$("logout").addEventListener("click", logout);
window.addEventListener("hashchange", () => void render());

// リロードしたとき、保存してあるパスワードでログインし直す。パスワードが違っていたら（変えた後など）消してログイン画面に戻す。
// つながらないときは、保存は残してログイン画面を出す（つながってからリロードすれば入れる）。
const restore = async () => {
  const saved = loadSession();
  if (saved === null) return;
  const candidate = createApi(saved, undefined, baseOf(loadTarget()));
  try {
    await candidate.verify();
  } catch (e) {
    if (e instanceof ApiError && e.kind === "unauthorized") clearSession();
    else loginError(e instanceof ApiError ? e.message : null);
    return;
  }
  api = candidate;
  showLogin(false);
  await render();
};
void restore();
