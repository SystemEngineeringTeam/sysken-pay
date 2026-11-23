# PR をマージしたあとの更新コマンド

コマンドだけをまとめたもの。理由や詳しい手順は `docs/raspberry-pi-setup.md`。

## 最初に守ること

**DB に触る前は、必ずバックアップを取る**（ラズパイで。`make deploy` は中で自動で取る。手で DB や `docker compose` を触るときは自分で取る）。

```bash
cd ~/sysken-pay/sysken-pay-backend
make backup
```

やってはいけないこと: `docker compose down -v` / `docker volume rm`（DB が全部消える）、`git reset --hard`、`git push --force`。

## 何をやるか決める

**先に「何が変わったか」を見て、該当するところだけやる。**

```bash
git diff --stat <前のコミット>..origin/main   # 変わったフォルダを見る
```

| 変わったもの | やること |
| --- | --- |
| `sysken-pay-front/` `sysken-pay-backend/`（コード・migration） | [1. ラズパイ](#1-ラズパイを更新する-make-deploy) |
| `deploy/raspberry-pi/` | 1 のあとに [2. 入れ直し](#2-deployraspberry-pi-が変わったとき) |
| `sysken-pay-admin/` | [3. 管理サイト](#3-管理サイトadmin-を-cloudflare-に出す-pc-で) |
| `sysken-pay-qr/` | [4. QR サイト](#4-qr-サイトqr-を-cloudflare-に出す-pc-で) |
| `.env` を変えた | [5. 環境変数](#5-env-を変えたとき) |
| `docs/` だけ | 何もしない |

## 1. ラズパイを更新する（make deploy）

ラズパイの中で打つ。

```bash
cd ~/sysken-pay/sysken-pay-backend
DRY_RUN=1 make deploy    # 先に確認（pull も再起動もしない）
make deploy              # 本番。pull・ビルド・バックアップ・migration・入れ替え・再起動
```

- 最後に `✅ 更新しました` が Slack に届く。失敗したら止まる（自動では戻らない）
  - 壊れたとき: API・DB は `sysken-pay-backend/.claude/skills/back-safe-rollback/SKILL.md`、画面は `sysken-pay-front/.claude/skills/front-safe-rollback/SKILL.md`
- 「⚠️ deploy/raspberry-pi が変わりました」と出たら 2 へ
- DB の状態だけ見る: `make migrate-status`

## 2. deploy/raspberry-pi が変わったとき

`make deploy` は自動では入れ直さない。**変わったファイルに合うものだけ**やる（ラズパイで）。

```bash
cd ~/sysken-pay
sh deploy/raspberry-pi/install-front-service.sh     # sysken-pay-front.service が変わった
sh deploy/raspberry-pi/install-kiosk.sh             # kiosk 系が変わった
sh deploy/raspberry-pi/install-japanese-input.sh    # 日本語入力が変わった（終わったら sudo reboot）
```

### 毎日のバックアップ（backup-daily.sh）を入れる・変えたとき

`git pull` では crontab は変わらない。**自分で確かめる。**

```bash
crontab -l    # backup-daily.sh の行が1つだけ。./scripts/backup-db.sh を直接呼ぶ古い行は crontab -e で消す
```

あるべき行:

```
0 3 * * * cd /home/sysken-pay/sysken-pay/sysken-pay-backend && sh ../deploy/raspberry-pi/backup-daily.sh >> backups/backup.log 2>&1
```

```bash
cd ~/sysken-pay/sysken-pay-backend
sh ../deploy/raspberry-pi/backup-daily.sh      # 「Google Drive に送りました」と出ること
rclone lsf sysken-pay-backup: --max-depth 1    # Drive に届いていること（読むだけ）
ls ~/.config/sysken-pay/                       # backup.env と notify.env があること（notify.env が無いと Slack に届かない）
tail -5 backups/backup.log                     # 翌日、03:00 台の記録があること
```

## 3. 管理サイト（admin）を Cloudflare に出す（PC で）

ラズパイには入らない。PC で、変更があったときだけ。
cloudflare sysken アカウントでデプロイ

```bash
cd sysken-pay-admin
pnpm install
pnpm build
cf deploy   # 出る先: https://admin.pay.sysken.net
```

## 4. QR サイト（qr）を Cloudflare に出す（PC で）

```bash
cd sysken-pay-qr
pnpm install
pnpm build
cf deploy   # 出る先: https://qr.pay.sysken.net
```

## 5. .env を変えたとき

`.env` を変えただけでは反映されない（ラズパイで。中身は人に見せない）。

```bash
cd ~/sysken-pay/sysken-pay-backend
docker compose up -d --build              # バック（ALLOWED_ORIGINS・API_BIND_ADDR など）
```

フロントの `.env` を変えたとき（先にビルドしてから再起動する）:

```bash
cd ~/sysken-pay/sysken-pay-front
pnpm build
sudo systemctl restart sysken-pay-front
```
