# sysken-pay-admin

PC で使う管理画面（静的サイト。商品の一覧（有効／無効のタブ）・更新・無効にする／有効に戻す・カメラで読んで登録、ユーザーの一覧・返金・利用停止/再開・削除・名前の変更・支払い用バーコードの再発行。`admin.pay.sysken.net` で配信する想定）。`sysken-pay-qr` と同じ構成（Vite + TypeScript + `cf`）。

- 通信先はログイン画面のプルダウンで選ぶ：ローカルネットワーク（`https://sysken-pay.local`、既定）／ローカル（`http://localhost:8080`）。増やすときは `src/config.ts` の `API_TARGETS` と `index.html` の CSP（`connect-src`）の両方に足す
- 管理者パスワードは、リロードしてもログインしたままにするため、このタブの sessionStorage に置く（タブやブラウザを閉じると消える。ログアウトでも消す。localStorage には置かない）。共用の PC では、使い終わったらログアウトする
- JAN が登録済みなら更新（PATCH）、なければ新規登録（POST）
- 画面は URL のハッシュで切り替える：`#/items`（`/new`、`/<JAN>`）、`#/users`（`/<学籍番号>`、`/edit`、`/issue`）
- 商品は消さずに「無効」にできる（ラズパイでは買えなくなり、「有効にする」でいつでも戻せる）。カメラで読んだ JAN が無効なら案内を出し、有効にするまで保存できない。ラズパイからは有効にできない（案内文だけ）
- 返金・利用停止・削除・まとめて停止は確認ダイアログを挟み、実行中はボタンを無効にして二重送信を防ぐ。「返金して利用停止」は返金が失敗したら停止しない
- バーコードの再発行は、詳細画面から（PC には学生証リーダーがない）。QR は 2 分で消え、画面を離れても消える。QR の行き先が不正なら、発行より先に断る
- ユーザー登録（`user-register`）と、その続きの `phone-register` は、まだラズパイの画面で行う

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
