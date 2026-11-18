// 発行用 QR から支払い用バーコードを受け取るページ。
// トークンは URL の「#」のあと（フラグメント）にあり、サーバーには送られない。
// ここで読み取って、本文で受け取り API に送る（アクセスログに残さないため）。
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

  const src = "data:image/png;base64," + body.barcode_png;
  $("user-name").textContent = body.user_name;
  $("barcode").src = src;
  $("display-code").textContent = body.display_code;
  $("download").href = src;

  // 使っているスマホの案内を開いておく
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) {
    $("guide-ios").open = true;
  } else if (/Android/.test(ua)) {
    $("guide-android").open = true;
  }

  show("done");
})();
