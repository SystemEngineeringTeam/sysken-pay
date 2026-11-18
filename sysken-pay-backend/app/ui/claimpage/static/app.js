// 発行用 QR から支払い用バーコードを受け取るページ。
// トークンは URL の「#」のあと（フラグメント）にあり、サーバーには送られない。
// ここで読み取って、本文で受け取り API に送る（アクセスログに残さないため）。
// 受け取ったバーコードから、長押しで「写真」に保存できる縦長のカード画像を作って出す。
(async () => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const show = (id) => {
    for (const s of ["loading", "error", "done"]) {
      $(s).hidden = s !== id;
    }
  };

  const fail = (message) => {
    $("error-message").textContent = message;
    show("error");
  };

  const messageFor = (status) => {
    switch (status) {
      case 400:
      case 404:
        return "この QR コードは使えません。役員にもう一度出してもらってください。";
      case 410:
        return "QR コードの期限（5分）が切れました。役員にもう一度出してもらってください。";
      case 429:
        return "失敗が続いたため、しばらく受け付けていません。1分ほど待ってから、QR コードを読み取り直してください。";
      default:
        return "うまく表示できませんでした。役員に伝えてください。";
    }
  };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  // ---- 保存用のカード画像 ----
  // 色はラズパイの画面と同じ（sysken-pay-front/src/styles/scss/_design-primitive.scss）
  const COLOR = {
    // 画像の背景（カードの後ろ）。ラズパイの画面の背景色（$white-10）
    bg: "#FFFDFB",
    blue: "#5398E1",
    blueLight: "#6FAAE8",
    white: "#FFFFFF",
    gray70: "#636A74",
    gray100: "#454A53",
  };
  const FONT = '"Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", system-ui, sans-serif';
  const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
  // スマホの画面に近い縦長（9:16）
  const W = 1080;
  const H = 1920;

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // 幅に収まるまで文字を小さくして書く
  const fitText = (ctx, text, x, y, maxWidth, size, weight, family) => {
    let s = size;
    do {
      ctx.font = `${weight} ${s}px ${family}`;
      s -= 2;
    } while (ctx.measureText(text).width > maxWidth && s > 20);
    ctx.fillText(text, x, y);
  };

  const drawCard = ({ name, code, barcode, mascot }) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // 背景
    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, W, H);

    // 見出し
    ctx.fillStyle = COLOR.blue;
    ctx.font = `800 88px ${FONT}`;
    ctx.fillText("シス研Pay", W / 2, 210);
    ctx.fillStyle = COLOR.gray100;
    ctx.font = `700 56px ${FONT}`;
    ctx.fillText("支払い用バーコード", W / 2, 300);

    // カード（青）
    const card = { x: 60, y: 390, w: 960, h: 1220, r: 56 };
    ctx.save();
    roundRect(ctx, card.x, card.y, card.w, card.h, card.r);
    const grad = ctx.createLinearGradient(card.x, card.y, card.x + card.w, card.y + card.h);
    grad.addColorStop(0, COLOR.blueLight);
    grad.addColorStop(1, COLOR.blue);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.clip();

    // 背景の飾り（薄い丸）
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.arc(card.x + card.w - 40, card.y + 80, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(card.x + 60, card.y + card.h - 40, 200, 0, Math.PI * 2);
    ctx.fill();

    // マスコット（カードの下の真ん中からのぞく。画像の下端をカードの下端に合わせる）
    if (mascot) {
      const mw = 420;
      const mh = (mascot.height / mascot.width) * mw;
      ctx.drawImage(mascot, card.x + (card.w - mw) / 2, card.y + card.h - mh, mw, mh);
    }
    ctx.restore();

    // カードの左上の文字
    ctx.textAlign = "left";
    ctx.fillStyle = COLOR.white;
    ctx.font = `800 44px ${FONT}`;
    ctx.fillText("シス研Pay", card.x + 56, card.y + 92);
    ctx.textAlign = "center";

    // バーコードの白い枠（読み取りやすいよう、まわりを広く白くする）
    const box = { x: card.x + 50, y: card.y + 140, w: card.w - 100, h: 500, r: 36 };
    ctx.fillStyle = COLOR.white;
    roundRect(ctx, box.x, box.y, box.w, box.h, box.r);
    ctx.fill();

    // バーコードは拡大せずに貼る（ぼやけると読めなくなるため）
    ctx.imageSmoothingEnabled = false;
    const bx = Math.round(box.x + (box.w - barcode.width) / 2);
    const by = box.y + 50;
    ctx.drawImage(barcode, bx, by);

    // SP の文字
    ctx.fillStyle = COLOR.gray100;
    fitText(ctx, code, W / 2, by + barcode.height + 96, box.w - 80, 56, 700, MONO);

    // 名前
    ctx.fillStyle = COLOR.white;
    fitText(ctx, name, W / 2, box.y + box.h + 120, card.w - 120, 60, 700, FONT);

    // カードの下の案内
    ctx.fillStyle = COLOR.gray70;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText("支払いのときは、この画面をリーダーにかざしてください", W / 2, 1720, W - 80);
    ctx.font = `500 34px ${FONT}`;
    ctx.fillText("読み取りにくいときは、画面を明るくしてください", W / 2, 1790, W - 80);

    return canvas.toDataURL("image/png");
  };

  // ---- ここから ----
  const match = /(?:^#|&)t=([^&]+)/.exec(location.hash);
  // 履歴やブックマークに残らないように、URL からトークンを消す
  if (location.hash) {
    history.replaceState(null, "", location.pathname);
  }
  if (!match) {
    fail("QR コードをもう一度読み取ってください。");
    return;
  }

  let res;
  try {
    res = await fetch("/claim/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: decodeURIComponent(match[1]) }),
      cache: "no-store",
    });
  } catch {
    fail("通信できませんでした。部室の Wi-Fi につながっているか確かめて、QR コードをもう一度読み取ってください。");
    return;
  }
  if (!res.ok) {
    fail(messageFor(res.status));
    return;
  }

  let body;
  try {
    body = await res.json();
  } catch {
    fail(messageFor(0));
    return;
  }

  const barcodeSrc = "data:image/png;base64," + body.barcode_png;
  let cardSrc = barcodeSrc;
  try {
    const [barcode, mascot] = await Promise.all([
      loadImage(barcodeSrc),
      // マスコットが無くてもカードは作る
      loadImage("/claim/mascot.png").catch(() => null),
    ]);
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    cardSrc = drawCard({ name: body.user_name, code: body.display_code, barcode, mascot });
  } catch {
    // カードを作れなかったときは、バーコードだけの画像を出す
  }

  $("card").src = cardSrc;

  // 使っているスマホの案内だけを出す（分からなければ両方出す）
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) {
    $("save-android").hidden = true;
    $("guide-ios").open = true;
  } else if (/Android/.test(ua)) {
    $("save-ios").hidden = true;
    $("guide-android").open = true;
  }

  show("done");
})();
