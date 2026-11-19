// 支払い用バーコードのカード画像を、スマホの中で作るページ。
// 支払い用文字列は URL の「#a=」のあと（フラグメント）にあり、サーバーには送られない。
// 読み取ったらすぐ URL から消す（履歴に残さない）。通信は一切しない。
// 作ったバーコード（JsBarcode）から、長押しで「写真」に保存できる縦長のカード画像を作って出す。
import { makeBarcode } from "./barcode";
import { drawCard } from "./card";
import { display, fromHash } from "./code";

const $ = (id: string) => document.getElementById(id) as HTMLElement;

const show = (id: "loading" | "error" | "done") => {
  for (const s of ["loading", "error", "done"]) {
    $(s).hidden = s !== id;
  }
};

const fail = (message: string) => {
  $("error-message").textContent = message;
  show("error");
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// 名前を URL のクエリで受け取る方法は未決（docs/phone-payment.md の「未決事項」）。決まるまでは名前なし
const readName = (): string => "";

const main = async () => {
  const code = fromHash(location.hash);
  // 履歴やブックマークに残らないように、URL から支払い用文字列を消す
  if (location.hash) {
    history.replaceState(null, "", location.pathname + location.search);
  }
  if (!code) {
    fail("QR コードをもう一度読み取ってください。");
    return;
  }

  let cardSrc: string;
  try {
    const barcode = makeBarcode(code);
    // マスコットが無くてもカードは作る
    const mascot = await loadImage("./mascot.png").catch(() => null);
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    try {
      cardSrc = drawCard({ name: readName(), code: display(code), barcode, mascot });
    } catch {
      // カードを作れなかったときは、バーコードだけの画像を出す
      cardSrc = barcode.toDataURL("image/png");
    }
  } catch {
    fail("うまく表示できませんでした。役員に伝えてください。");
    return;
  }

  ($("card") as HTMLImageElement).src = cardSrc;

  // 使っているスマホの案内だけを出す（分からなければ両方出す）
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) {
    $("save-android").hidden = true;
    ($("guide-ios") as HTMLDetailsElement).open = true;
  } else if (/Android/.test(ua)) {
    $("save-ios").hidden = true;
    ($("guide-android") as HTMLDetailsElement).open = true;
  }

  show("done");
};

void main();
