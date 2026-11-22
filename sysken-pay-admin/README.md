# sysken-pay-admin

PC で使う管理画面（静的サイト。商品の一覧（有効／無効のタブ）・更新・無効にする／有効に戻す・カメラで読んで登録、ユーザーの一覧・返金・利用停止/再開・削除・名前の変更・支払い用バーコードの再発行。`admin.pay.sysken.net` で配信する想定）。`sysken-pay-qr` と同じ構成（Vite + TypeScript + `cf`）。

- 通信先はログイン画面のプルダウンで選ぶ：ローカルネットワーク（`http://sysken-pay.local:8080`、既定。ポート 8080 が要る）／ローカル（`http://localhost:8080`）。増やすときは `src/config.ts` の `API_TARGETS` と `index.html` の CSP（`connect-src`）の両方に足す
- 管理者パスワードは、リロードしてもログインしたままにするため、このタブの sessionStorage に置く（タブやブラウザを閉じると消える。ログアウトでも消す。localStorage には置かない）。共用の PC では、使い終わったらログアウトする
- JAN が登録済みなら更新（PATCH）、なければ新規登録（POST）
- 画面は URL のハッシュで切り替える：`#/items`（`/new`、`/<JAN>`）、`#/users`（`/<学籍番号>`、`/edit`、`/issue`）
- 商品は消さずに「無効」にできる（ラズパイでは買えなくなり、「有効にする」でいつでも戻せる）。カメラで読んだ JAN が無効なら案内を出し、有効にするまで保存できない。ラズパイからは有効にできない（案内文だけ）
- 返金・利用停止・削除・まとめて停止は確認ダイアログを挟み、実行中はボタンを無効にして二重送信を防ぐ。「返金して利用停止」は返金が失敗したら停止しない
- バーコードの再発行は、詳細画面から（PC には学生証リーダーがない）。QR は 2 分で消え、画面を離れても消える。QR の行き先が不正なら、発行より先に断る
- ユーザー登録は `#/users/new`。学籍番号（`X24042` の形）を入れ、名前を入れて登録すると、そのまま QR の発行（`#/users/<ID>/issue`）へ進む。DB には先頭に `20` を付けた形（`20X24042`）で入る。Microsoft でログインしているときは「Microsoft で名前を探す」で Graph から名前を引ける（スコープ `User.ReadBasic.All`。管理者の同意が要るなどで取れないときは、手で入れる）。ラズパイの `user-register` も残す
- **Microsoft（Entra ID）でログイン**できる（`@azure/msal-browser`、リダイレクト方式）。パスワードは予備として残す。許可されるのは、「管理者の許可」画面（`#/admins`）の一覧にいる人だけ（最初の 1 人はパスワードで入って足す）。トークンは MSAL に任せ、localStorage には置かない。ログイン中の人の名前とプロフィール画像（Graph の `/me/photo/$value`。なければイニシャル）を右上に出す。`sysken@aitech.ac.jp` は許可リストに最初から入っていて外せない。設計は `../docs/admin-entra-login.md`
  - ビルド時に `VITE_ENTRA_TENANT_ID` と `VITE_ENTRA_CLIENT_ID`（秘密ではない ID）を渡す。空なら「Microsoft でログイン」は出ず、パスワードだけで入る。バックエンドにも同じ ID を `ENTRA_TENANT_ID` / `ENTRA_CLIENT_ID` で渡す
  - Entra のアプリ登録は SPA 型で、リダイレクト URI に `http://localhost:5173` と `https://admin.pay.sysken.net` を足す
- 許可リストへの足し方の「学籍番号で探す」は、これから作る

## 使う

```sh
pnpm install
pnpm dev        # http://localhost:5173（localhost ならカメラも使える）
pnpm test
pnpm build
pnpm deploy     # cf deploy
```

## 前提

- バックエンドの `.env` の `ALLOWED_ORIGINS` に、配信元（`https://admin.pay.sysken.net`）を足す。手元で試すだけなら既定の `http://localhost:5173` で足りる
- ラズパイの外から届かせるには `API_BIND_ADDR=0.0.0.0`（API の既定ポートは 8080）
- 公開ページ（HTTPS）から呼べるのは HTTPS の通信先だけ（混在コンテンツ）。ラズパイ側の HTTPS 化は未決
