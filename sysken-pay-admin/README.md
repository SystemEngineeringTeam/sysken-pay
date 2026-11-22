# sysken-pay-admin

商品を PC のカメラで読んで、JAN・名前・値段をバックエンドに登録する管理画面（静的サイト。`admin.pay.sysken.net` で配信する想定）。`sysken-pay-qr` と同じ構成（Vite + TypeScript + `cf`）。

- 通信先はログイン画面のプルダウンで選ぶ：ローカルネットワーク（`https://sysken-pay.local`、既定）／ローカル（`http://localhost:8080`）。増やすときは `src/config.ts` の `API_TARGETS` と `index.html` の CSP（`connect-src`）の両方に足す
- 管理者パスワードはメモリにだけ置く（保存しない）
- JAN が登録済みなら更新（PATCH）、なければ新規登録（POST）

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
