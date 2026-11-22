// 管理画面（商品・ユーザー・管理者の許可）。ログインは Microsoft（Entra ID）が主で、パスワードは予備。
// Microsoft のトークンは MSAL に任せ、自分では保存しない。パスワードは、リロードしてもログインしたままにするため、このタブの sessionStorage に置く
// （タブを閉じると消える。localStorage には置かない・URL に入れない）。
// 通信先は config.ts の内部アドレスだけ。画面は URL のハッシュで切り替える（route.ts）。
import { type Api, ApiError, createApi } from "./api";
import { API_TARGETS, baseOf, loadTarget, parseTargetId, saveTarget } from "./config";
import { createBrowserEntra, type Entra, LOOKUP_SCOPES } from "./entra";
import { fetchDisplayName, fetchMyPhoto, initialOf } from "./graph";
import { toUpn } from "./studentId";
import { parseRoute, sectionOf } from "./route";
import { singleFlight } from "./save";
import { clearSession, loadSession, saveSession } from "./session";
import { h, type ViewContext } from "./ui";
import { adminsList } from "./views/admins";
import { itemEdit, itemRegister, itemsList } from "./views/items";
import { userDetail, userEdit, userIssue, userNew, usersList } from "./views/users";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let api: Api | null = null;
let entra: Entra | null = null;
let viaMicrosoft = false;
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
  $("nav-admins").classList.toggle("active", section === "admins");
  const e = viaMicrosoft ? entra : null;
  const lookupName = e
    ? async (studentId: string) => {
        const upn = toUpn(studentId);
        const token = upn ? await e.getGraphToken(LOOKUP_SCOPES, { interactive: true }) : null;
        return upn && token ? fetchDisplayName(token, upn) : null;
      }
    : undefined;
  const ctx: ViewContext = { api, onLeave: (fn) => void leave.push(fn), lookupName };
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
    case "userNew":
      return userNew(root, ctx);
    case "user":
      return userDetail(root, ctx, route.id);
    case "userEdit":
      return userEdit(root, ctx, route.id);
    case "userIssue":
      return userIssue(root, ctx, route.id);
    case "admins":
      return adminsList(root, ctx);
  }
};

// ログイン中の人（名前と、あれば Microsoft のプロフィール画像）を右上に出す。画像は取れなくても続ける
let photoUrl: string | null = null;
const clearMe = () => {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null;
  $("me").hidden = true;
  $("me-avatar").replaceChildren();
  $("me-name").textContent = "";
};
const showMe = async (e: Entra) => {
  const name = e.account?.name || e.account?.username || "";
  $("me-name").textContent = name;
  $("me-avatar").textContent = initialOf(name);
  $("me").hidden = false;
  const token = await e.getGraphToken();
  const blob = token ? await fetchMyPhoto(token) : null;
  // 取得中にログアウトされていたら捨てる
  if (!blob || $("me").hidden || !viaMicrosoft) return;
  photoUrl = URL.createObjectURL(blob);
  const img = h("img", { src: photoUrl, alt: "" });
  $("me-avatar").replaceChildren(img);
};

const showLogin = (on: boolean) => {
  $("login").hidden = !on;
  $("view").hidden = on;
  $("nav").hidden = on;
  $("logout").hidden = on;
  if (on) clearMe();
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
  viaMicrosoft = false;
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
  // Microsoft でログインしていたら、Microsoft 側からもサインアウトする（共用の PC のため）
  if (viaMicrosoft && entra) void entra.logout();
  viaMicrosoft = false;
};

// Microsoft でログイン: サインイン画面へ移る。戻ってきたら restore が拾う（つなぐ先は先に保存しておく）
const microsoftLogin = singleFlight(async () => {
  loginError(null);
  const target = parseTargetId($<HTMLSelectElement>("api-target").value);
  if (!target || !entra) return;
  saveTarget(target);
  try {
    await entra.login();
  } catch {
    loginError("Microsoft のログインを始められませんでした。もう一度試してください。");
  }
});

const targetSelect = $<HTMLSelectElement>("api-target");
for (const t of API_TARGETS) targetSelect.add(new Option(t.label, t.id));
targetSelect.value = loadTarget();
$("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  void login();
});
$("ms-login").addEventListener("click", () => void microsoftLogin());
$("logout").addEventListener("click", logout);
window.addEventListener("hashchange", () => void render());

// 開いたとき、Microsoft のサインイン済み（リダイレクトから戻った直後を含む）か、保存してあるパスワードでログインし直す。
// パスワードが違っていたら（変えた後など）消してログイン画面に戻す。
// つながらないときは、保存は残してログイン画面を出す（つながってからリロードすれば入れる）。
const restore = async () => {
  try {
    entra = await createBrowserEntra();
    $("ms-login-box").hidden = entra === null;
    if (entra && (await entra.init())) {
      const e = entra;
      const candidate = createApi(() => e.getIdToken(), undefined, baseOf(loadTarget()));
      try {
        await candidate.verify();
        api = candidate;
        viaMicrosoft = true;
        showLogin(false);
        void showMe(e);
        await render();
        return;
      } catch (err) {
        // 許可されていない・つながらないときは、理由を出してログイン画面に残る（パスワードでは入れる）
        loginError(err instanceof ApiError ? err.message : "うまくいきませんでした。もう一度試してください。");
        return;
      }
    }
  } catch {
    // Microsoft ログインが使えなくても、パスワードでは入れる
  }
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
