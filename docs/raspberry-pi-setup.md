# ラズパイのセットアップ手順

部室の Raspberry Pi 5 に、シス研Pay を一から入れる手順。2026-11 に実際にこの手順で入れた。
ラズパイを入れ替えるとき・入れ直すときは、上から順に進める。

## 前提

- Raspberry Pi 5（64bit。`uname -m` が `aarch64`）
- OS：Raspberry Pi OS（Debian 13 trixie ベース。`grep PRETTY_NAME /etc/os-release`）
- ログインユーザー：`sysken-pay`（ホームは `/home/sysken-pay`）。**自動ログイン**を有効にしておく（`/etc/lightdm/lightdm.conf` の `autologin-user=sysken-pay`）
- 画面：Wayland + labwc（`echo $XDG_SESSION_TYPE` が `wayland`）
- 部で管理しているルーターに接続。IP アドレスは部の管理表を参照（**このリポジトリは公開なので、IP アドレスはここに書かない**）
- 遠隔操作は Raspberry Pi Connect を使う
  - ふだんのコマンドは「リモートシェル」で打つ
  - ラズパイの画面にアプリを開くときだけ、画面共有の中のターミナルを使う
  - リモートシェルに日本語を含む長い文を貼り付けると崩れることがある。長い設定はこのリポジトリのスクリプトを使う

## 1. Docker を入れる

Docker 公式の Debian 向け手順（https://docs.docker.com/engine/install/debian/）。

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
sudo reboot
```

確認：`docker run --rm hello-world` で `Hello from Docker!`、`systemctl is-enabled docker containerd` が両方 `enabled`。

## 2. Node.js と pnpm を入れる

Debian 13 の標準の Node.js（20.19）で、フロントのビルド（Vite 7 は 20.19 以上が必要）に足りる。

```bash
sudo apt install -y nodejs npm
sudo npm install -g pnpm
```

## 3. リポジトリを置く

```bash
cd ~
git clone https://github.com/SystemEngineeringTeam/sysken-pay.git
```

## 4. バックエンド（API と DB）

```bash
cd ~/sysken-pay/sysken-pay-backend
cp .env.sample .env
DBPASS=$(openssl rand -hex 16)
sed -i "s/^MYSQL_ROOT_PASSWORD=.*/MYSQL_ROOT_PASSWORD=$DBPASS/; s/^MYSQL_PASSWORD=.*/MYSQL_PASSWORD=$DBPASS/" .env
unset DBPASS
chmod 600 .env
nano .env    # ADMIN_PASSWORD（管理者画面）と CHARGE_PASSWORD（チャージの画面）を、役員が決めた別々のパスワードにする
grep -c change-me .env    # 0 なら OK
docker compose up -d --build
```

- DB のパスワードはランダムな値にする（人が打つことはない。バックアップなどはコンテナの中から読む）
- `.env` の中身はチャットや issue に貼らない
- `docker compose up` には必ず `-d` を付ける（付けないとターミナルを閉じたときに止まる）

確認：

```bash
docker compose ps    # sysken-db が healthy、ポートが 127.0.0.1: から始まる
curl -s localhost:8080/v1/health; echo    # OK（DB につながっていないときは NG と 503）
docker exec sysken-db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "SHOW TABLES" sysken_pay' 2>/dev/null
```

新しく作る DB には `db/init.sql` がすべて入るので、migration は流さない。ただし、一覧の表に印をつけるため、`sysken-pay-backend/README.md` の「最初の1回だけ」の `make migrate-baseline UPTO=<一番大きい番号>` を打つ。

## 5. フロント

```bash
cd ~/sysken-pay/sysken-pay-front
cp .env.sample .env
pnpm install --frozen-lockfile
pnpm build
sh ../deploy/raspberry-pi/install-front-service.sh    # active と出れば OK
```

- `pnpm install` で `ERR_PNPM_IGNORED_BUILDS`（esbuild・@parcel/watcher）が出ても、`pnpm build` が `✓ built` になれば問題ない。一度 `pnpm approve-builds` で2つとも許可しておくと、次から出なくなる
  - このエラーで `pnpm install` は失敗扱いになるので、`&&` で後ろのコマンドをつながない
- フロントは `sysken-pay-front.service`（`deploy/raspberry-pi/sysken-pay-front.service`）として動く。`127.0.0.1:3000` だけで待つので、部室の Wi-Fi からは開けない

## 6. キオスク表示（Chromium の全画面）

```bash
sh ~/sysken-pay/deploy/raspberry-pi/install-kiosk.sh
sudo reboot
```

- ログインすると `~/sysken-pay-kiosk.sh` が起動し、フロントが立ち上がるのを待ってから Chromium を全画面で開く。閉じても自動で開き直す
- `~/.config/labwc/autostart` は、標準（`/etc/xdg/labwc/autostart`）の内容をコピーしたうえで、キオスクの行を足したもの
- Chromium は `--password-store=basic` で起動する。付けないと「鍵束（キーリング）のパスワード」の画面が出て、答えるまでページの読み込みが止まる

保守で全画面を止めたいとき：

```bash
touch ~/.kiosk-disabled && pkill -f chromium
# 元に戻す: rm ~/.kiosk-disabled してから sudo reboot
```

## 7. DB のバックアップを毎日取る

```bash
cd ~/sysken-pay/sysken-pay-backend
mkdir -p backups
sh ../deploy/raspberry-pi/backup-daily.sh    # 手動で1回動かして、動くことを確かめる
ls -lh backups/
(crontab -l 2>/dev/null; echo "0 3 * * * cd /home/sysken-pay/sysken-pay/sysken-pay-backend && sh ../deploy/raspberry-pi/backup-daily.sh >> backups/backup.log 2>&1") | crontab -
crontab -l    # backup-daily.sh の行が1つだけあること
```

- 毎日 3:00 に `backups/` へ保存する。結果は `backups/backup.log`
- 古い `crontab` の行（`./scripts/backup-db.sh` を直接呼ぶもの）が残っている人は、`crontab -e` でその行を消して、上の行に置き換える（二重に動かさない）
- **すでに動いているラズパイは、必ず `crontab -l` で確かめる。** 古い行のままだと、ラズパイの中に保存するだけで、Google Drive に送られず、Slack にも知らせず、古いファイルの整理（14 日）もされない（ログに「保存しました」しか出ない）。`git pull` では crontab は変わらないので、手で置き換える必要がある。置き換えたあとは、`sh ../deploy/raspberry-pi/backup-daily.sh` を1回動かして「Google Drive に送りました」と出ることを確かめる
- ラズパイの中は、14 日より古い `sysken_pay-*.sql.gz` を消す（`backups/deploy/` は消さない）
- 毎日の結果を Slack に知らせる（成功 ✅・Drive に送っていない ⚠️・失敗 🚨。「12. Slack に連絡する」を済ませておく）
- バックアップには部員の個人情報と残高が入るので、ファイルは自分だけが読める権限で作られる
- このままだと SD カードの中にしかない。ラズパイの外（Google Drive）にも送る → 「13. Google Drive にバックアップを送る」

## 8. IP アドレスを固定する

スマホ登録の QR に入れる URL にラズパイの IP アドレスを使うので、変わらないようにする。
本当はルーターの予約（MAC アドレスで固定）がきれいだが、ルーター側の登録が合っていなくても動くように、ラズパイ側でも固定する。

調べる（`<...>` に入れる値はここから読む。IP アドレスは部の管理表の値を使う）:

```bash
nmcli -t -f NAME,DEVICE connection show --active   # Wi-Fi の接続名（<接続名>）
ip -br addr show wlan0                             # 今の IP と、/ のあとの数（<範囲>。例: 23）
ip route | grep default                            # via のあとがゲートウェイ（<ゲートウェイ>）
ping -c 2 <IP>                                     # 返事が無ければ、その IP は空いている
```

遠隔で変えるときは、失敗しても5分後に元に戻るように予約してから変える（1行ずつ）:

```bash
sudo systemd-run --unit=ip-rollback --on-active=5min /bin/sh -c 'nmcli connection modify <接続名> ipv4.method auto ipv4.addresses "" ipv4.gateway "" ipv4.dns "" && nmcli connection up <接続名>'
sudo nmcli connection modify <接続名> ipv4.method manual ipv4.addresses <IP>/<範囲> ipv4.gateway <ゲートウェイ> ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli connection up <接続名>     # ここでリモートシェルが切れる。1分ほど待ってつなぎ直す
ip -br addr show wlan0                # <IP> になっていること
ping -c 2 8.8.8.8                     # 返事があること
sudo systemctl stop ip-rollback.timer # うまくいったら、元に戻す予約を取り消す（忘れると5分後に戻る）
```

- うまくいかなければ何もしなくてよい。5分後に元の設定に戻るので、6分ほど待ってつなぎ直す
- Wi-Fi の名前やパスワードが変わったら、やり直す

## 9. スマホ登録（QR）の行き先を設定する

スマホ登録の QR は、ラズパイの外にある静的サイト（`sysken-pay-qr`、`https://qr.pay.sysken.net`）に飛ぶ。
ラズパイを Wi-Fi に開ける必要はなく、ポートも増えない（購入などの API は今まで通りラズパイの中からしか届かない）。

```bash
cd ~/sysken-pay/sysken-pay-front
nano .env    # 下の1行を書く（スキームは省略できる）
#   VITE_QR_ENDPOINT=qr.pay.sysken.net
```

- フロントを作り直したあと、管理メニュー →「バーコード再発行」（またはユーザー登録の続き）で QR を出して、スマホで読み取れることを確かめる
- スマホは**インターネットにつながっている**必要がある（部室の Wi-Fi の中だけでは開けない）
- QR は2分で消える

## 10. 確認

- 再起動後、何も操作しなくてもシス研Pay の画面が全画面で出る
- 右上の歯車 → 管理者パスワードで管理メニューに入れる

## 11. 日本語（漢字・ひらがな）を打てるようにする

名前を `k24000_シス研太郎` の形で登録するため。fcitx5 と Mozc を入れる。

```bash
cd ~/sysken-pay
sh deploy/raspberry-pi/install-japanese-input.sh
sh deploy/raspberry-pi/install-kiosk.sh
sudo reboot
```

- 名前の入力欄で `Ctrl + Space` を押すと、英数と日本語が切り替わる
- キオスクの Chromium は、fcitx5 が入っていれば日本語入力を使う設定（`--enable-wayland-ime` など）で起動する
- 切り替わらないときは、Chromium を X11 で動かして試す（効かなければファイルを消して元に戻す）

```bash
mkdir -p ~/.config/sysken-pay
echo "--ozone-platform=x11" > ~/.config/sysken-pay/kiosk-flags
pkill -f chromium
```

- タッチ画面だけで打つには、画面に出すキーボードが別に要る（まだ用意していない）。今は USB キーボードか Raspberry Pi Connect で打つ

## 12. Slack に連絡する

`make deploy` の成功・失敗、バックアップの失敗などを Slack に送る仕組み（`deploy/raspberry-pi/notify-slack.sh`）。**Webhook の URL は秘密**で、リポジトリには書かない（公開リポジトリのため）。置き場所はラズパイの中の、リポジトリの外。

### Webhook を作る（Slack の画面で。役員のだれかが1回やる）

1. ブラウザで Slack API（`api.slack.com/apps`）を開き、部の Slack にログインする
2. 「Create New App」→「From scratch」→ 名前（例：シス研Pay）と、部の Slack ワークスペースを選ぶ
3. 左のメニューの「Incoming Webhooks」→ 「Activate Incoming Webhooks」を On にする
4. 「Add New Webhook to Workspace」→ 連絡を受け取るチャンネル「#set_syskenpay-notification」（役員だけのプライベートチャンネル。先に作っておく）を選ぶ。Webhook は1つだけで、すべての連絡がここに届く
5. 出てきた `https://hooks.slack.com/...` の URL をコピーする（**URL はチャットや issue・PR に貼らない**）

### ラズパイに置く

```bash
mkdir -p ~/.config/sysken-pay && chmod 700 ~/.config/sysken-pay
cp ~/sysken-pay/deploy/raspberry-pi/notify.env.sample ~/.config/sysken-pay/notify.env
chmod 600 ~/.config/sysken-pay/notify.env
nano ~/.config/sysken-pay/notify.env       # SLACK_WEBHOOK_URL= のあとに、コピーした URL を貼る
```

- 置き場所は `~/.config/sysken-pay/notify.env`（リポジトリの外）。別の場所にするときは、環境変数 `SYSKEN_PAY_NOTIFY_ENV` にファイルの場所を入れる
- 書くのは `SLACK_WEBHOOK_URL=...` の1行だけ（見本は `deploy/raspberry-pi/notify.env.sample`）

### 試す

```bash
cd ~/sysken-pay
NOTIFY_DRY_RUN=1 sh deploy/raspberry-pi/notify-slack.sh ok "テストです"   # 送らずに、送る文だけ出す
sh deploy/raspberry-pi/notify-slack.sh ok "テストです（連絡の試し）"      # 実際に Slack へ送る
```

- チャンネルに「✅ テストです（連絡の試し）」と、日時が届けば成功
- URL の設定が無い・送れないときは、「連絡は送れなかった」と出るだけで、`make deploy` などは止まらない（連絡が届かないことに気づくために、設定したら必ず上のテストを1回やる）

### 送る・送らないもの

- 送る：何が起きたか・いつ・次にやること（日本語の短い文）
- 送らない：HRI（SP バーコードの番号）、パスワード、IP アドレス、URL、`.env` の中身、ログのまるごと
  - スクリプトは、送る前にこれらしきものを「[省略]」に置き換え、10行・1行200文字までに切る（安全のための最後の網。呼ぶ側も、要点だけを渡す）
- スクリプトのテスト：`sh deploy/raspberry-pi/test-notify-slack.sh`（本物の Slack には送らない）
- Webhook の URL が漏れたら、Slack の画面でその Webhook を削除して作り直し、`notify.env` を書き換える

## 13. Google Drive にバックアップを送る

毎日のバックアップ（`sysken_pay-*.sql.gz`）を、共有の Google Drive に送る。送る道具は rclone。
`backup.env` が無いあいだは、Drive には送らず、ラズパイの中のバックアップだけを取る（何も壊れない）。

決めたこと:

- 送るのは `sysken_pay-*.sql.gz` だけ（`backups/deploy/` は送らない）
- **暗号化はしない**。ダンプには部員の学籍番号・氏名・残高が入っているので、保存先の共有範囲は最小限にする
- Drive 側のファイルは**消さない**（`rclone copy` は送るだけ。すでにあるファイルは上書きもしない）。容量が足りなくなったら人が整理する
- 送れなかった日があっても、次の日にまとめて送る。送れなかったときは Slack に知らせ、ラズパイ側の古いファイルも消さない

### 準備（1 回だけ）

認証は **Google アカウントでのログイン（OAuth）**。ブラウザが要るので、ログインは Mac で行い、できた設定ファイルをラズパイに持っていく。

**Mac で行う**

1. rclone を入れる: `brew install rclone`
2. `rclone config` で remote を作る（名前: `sysken-pay-backup`）
   - Storage は `drive`、`client_id` / `client_secret` は Google Cloud Console で作った OAuth クライアントの値
   - `scope` は `drive`、`root_folder_id` に送り先フォルダの ID（フォルダの URL の末尾）
   - 最後に「自動認証しますか」に `y` → ブラウザが開くので、**バックアップ用の共有アカウント**でログインして許可する
3. 確かめる（読むだけ）: `rclone lsd sysken-pay-backup:` または `rclone lsf sysken-pay-backup: --max-depth 1`
4. 設定ファイルの場所: `rclone config file`（Mac では `~/.config/rclone/rclone.conf`）

**ラズパイに持っていく**（cron を動かすのと同じユーザーで）

5. ラズパイで: `mkdir -p ~/.config/rclone ~/.config/sysken-pay`
6. Mac から `rclone.conf` をコピーする（`<ユーザー>` と `<ラズパイ>` はいつも SSH で使っている接続先）:
   ```bash
   scp ~/.config/rclone/rclone.conf <ユーザー>@<ラズパイ>:~/.config/rclone/rclone.conf
   ```
   USB メモリで渡してもよい。OAuth 方式は鍵ファイルが無く、`rclone.conf` の中に `token` が入っているので、**これ 1 つ**を持っていく
7. ラズパイで: `chmod 600 ~/.config/rclone/rclone.conf`（`sudo rclone config` はしない。cron から見えなくなる）
8. 設定ファイルを置く:
   ```bash
   cp ~/sysken-pay/deploy/raspberry-pi/backup.env.sample ~/.config/sysken-pay/backup.env
   chmod 600 ~/.config/sysken-pay/backup.env
   # RCLONE_DEST を remote 名に合わせる（例: sysken-pay-backup:）
   ```
9. 確かめる（まだ何も送らない）: `rclone lsf sysken-pay-backup: --max-depth 1` がエラーにならないこと
10. 手動で 1 回動かす:
    ```bash
    cd ~/sysken-pay/sysken-pay-backend
    sh ../deploy/raspberry-pi/backup-daily.sh
    rclone lsf sysken-pay-backup: | grep sysken_pay-    # 今日のファイルが見えること
    ```

**秘密情報の扱い**

- `rclone.conf`（`client_secret` と `token` が入る）は秘密。リポジトリに入れない・チャットや Slack に貼らない。もし貼ってしまったら、Google Cloud Console で `client_secret` を作り直し、`rclone config reconnect` で入れ直す
- `scope = drive` は、そのアカウントの Drive 全体を読み書きできる権限。**バックアップ専用の共有アカウント**を使い、個人のアカウントは使わない
- 使い終わった Mac 側の `rclone.conf` は、必要なければ自分で消す
- `token` は、そのアカウントのパスワード変更や、アクセス権の取り消しで使えなくなる。使えなくなったら、Mac で `rclone config reconnect sysken-pay-backup:` をして、`rclone.conf` を持っていき直す

### 送れないとき

- Slack に「Google Drive に送れませんでした」と出たら、`backups/backup.log` を見る
- `storageQuotaExceeded` / `quota` → 送り先のアカウントの Drive の空きが無い。空きを作る（Drive 側のファイルは自動では消さない）
- `invalid_grant` / `token expired` / `empty token` → ログインが切れた。Mac で `rclone config reconnect sysken-pay-backup:` をして、`rclone.conf` を持っていき直す
- `403` / `notFound` → そのアカウントにフォルダの権限が無い、または `root_folder_id` が違う
- `rclone: command not found` → rclone が入っていない（手順 1）
- 直したら手順 6 をもう一度。ラズパイの中に残っている分は、次の実行でまとめて送られる

### Drive から戻すとき

Drive のファイルは暗号化していない普通の `.sql.gz`。ダウンロードして `sysken-pay-backend/backups/` に置けば、これまでどおり `make restore` で戻せる（戻す前に、必ず今の状態を `make backup` で退避する）。

## 14. 管理サイト（PC から商品・ユーザーを管理する）

商品の登録・更新・無効化と、ユーザーの一覧・返金・利用停止/再開・非表示・削除・名前の変更・バーコード再発行は、PC のブラウザで使う管理サイト（`sysken-pay-admin`、`https://admin.pay.sysken.net`）で行う。ラズパイの画面に残っているのは、ユーザー登録（学生証を読む）とバーコード再発行（QR を出す）だけ。

サイトは Cloudflare にあって、ラズパイには入らない（`make deploy` は何もしない）。ラズパイ側でやることは、API を PC から届くようにすることだけ。

1. `sysken-pay-backend/.env` に書く（**中身は人に見せない**）
   - `ALLOWED_ORIGINS` に `https://admin.pay.sysken.net` を足す（今ある値は消さない）
   - `API_BIND_ADDR=0.0.0.0`（既定は `127.0.0.1` で、ラズパイの外から届かない。API のポートは 8080）
2. API を作り直す：`cd ~/sysken-pay/sysken-pay-backend && docker compose up -d --build`（`.env` を変えただけでは反映されない）
3. 確認：同じネットワークの PC から `curl -i http://sysken-pay.local:8080/v1/health` が `200` を返すこと。返らないときは、ラズパイの名前（avahi が動いているか）と `API_BIND_ADDR` を確かめる
4. 管理サイトを出す（PC で。変更があったときだけ）：`cd sysken-pay-admin && pnpm install && pnpm build && cf deploy`

- 管理サイトの入口は管理者パスワード（`ADMIN_PASSWORD`）。公開されたページに打つので、使い終わったらログアウトする
- ⚠️ **未決**：公開ページ（HTTPS）から呼べるのは HTTPS の通信先だけ（混在コンテンツ）。ラズパイの API を HTTPS にする方法は決まっていない。決まるまでは、PC で `pnpm dev` を開き（`http://localhost:5173`）、通信先を「ローカル」にして試す。決まる前に、勝手に決めて入れない（`docs/phone-payment.md` と同じ扱い）

## 更新するとき（make deploy）

```bash
cd ~/sysken-pay/sysken-pay-backend
make deploy
```

- 最新の `main` を取ってきて、**変わったところだけ**入れ替える。1回で終わる
- 先に何をするか見たいとき：`DRY_RUN=1 make deploy`（pull も再起動もしない。何が変わっていて、何をするかだけ表示する）
- 動く順番：
  1. 変わったものを全部ビルドする（フロントは `dist-new` に作る。バックは `docker compose build`）。ここで失敗しても、動いているものには触らない
  2. バックアップ（`sysken-pay-backend/backups/deploy/` に、新しい順 10 件だけ残す。毎日のバックアップとは別の場所）
  3. migration（まだ当たっていないものだけ）
  4. バックを入れ替えて、`GET /v1/health`（DB につながっていれば 200）を 2 秒おきに 15 回まで確かめる
  5. フロントの `dist` を入れ替えて（古いものは `dist-new` に残る）、`sysken-pay-front` を再起動し、Chromium を開き直す。画面は数秒止まる
- 変更の種類ごとの動き：

  | 変わったもの | 動き |
  | --- | --- |
  | 更新なし | 「更新はありません」と出すだけ（Slack には送らない） |
  | `docs/` だけ | 「ドキュメントだけの更新です（再起動なし）」（Slack には送らない） |
  | `sysken-pay-qr/`・`sysken-pay-admin/`・README だけ | 何もしない（再起動なし）。この2つは Cloudflare に出すサイトで、ラズパイには入らない（出し方は「14.」） |
  | `sysken-pay-front/` | フロントだけビルドして入れ替える（`pnpm-lock.yaml` が変わったときだけ `pnpm install` もする） |
  | `sysken-pay-backend/` のコード | バックだけビルド・バックアップ・migration・入れ替え |
  | `db/migrations/` | バックアップして migration（`make migrate-up` と同じ） |
  | `deploy/raspberry-pi/` | **自動では入れ直さない**。「⚠️ deploy/raspberry-pi が変わりました。手順書を見て入れ直してください」と端末と Slack に出す。この手順書の該当の節（サービス・キオスク・日本語入力など）をやり直す |

- 成功すると、Slack に「✅ 更新しました（前のコミット → 新しいコミット）」が1行届く
- 同時に2つは動かない（動いていると「更新中です」と出て止まる。終わる・落ちると自動で外れる）
- キオスクを止めているとき（`~/.kiosk-disabled` がある）は、Chromium は触らない
- `make deploy` はラズパイの中で打つ。スクリプトのテスト：`sh deploy/raspberry-pi/test-deploy.sh`

### 失敗したとき

Slack に「🚨 make deploy が「○○」で失敗しました」と届く。**自動では元に戻さない**（止まったところで、そのままにしてある）。「○○」の段階ごとに：

- **フロントのビルド・バックエンドのビルド**：動いているものには触っていない。端末に出たエラーを見て直し、もう一度 `make deploy`
- **バックアップ**：何も変えていない。`backups/deploy/` の空き容量・`docker ps` で `sysken-db` が動いているか見て、もう一度
- **migration**：途中まで反映されていることがある（**MySQL の `CREATE` / `ALTER` / `DROP` は戻せない**）。`make migrate-status` で当たったところを見る。直前のバックアップは `backups/deploy/` の一番新しいもの。**自分で DB を消したり戻したりせず**、`back-safe-rollback`（`sysken-pay-backend/.claude/skills/back-safe-rollback/SKILL.md`）に従う
- **バックエンドの入れ替え・health 確認**：新しいバックが DB につながっていない。`docker compose logs --tail 50` を見る（パスワードなど秘密は他の人に見せない）。`.env` の変数が足りないことが多い（「`.env` の確認」を参照）。DB が止まっているだけなら `docker compose start sysken-db`（`down` や `-v` は使わない）
- **フロントの入れ替え**：`dist-tmp` が残っていると止まる（前の失敗の跡）。中を見て、手で片づける。古い画面は `dist-new` に残っている
- **フロントの再起動・確認**：`sudo systemctl status sysken-pay-front`、`journalctl -u sysken-pay-front -n 50`
- 壊れた・元に戻したいときは、画面なら `front-safe-rollback`、API・DB・残高なら `back-safe-rollback` に従う
- 直したら、もう一度 `make deploy`（pull 済みなので「更新はありません」と出る場合は、止まった段階から手で進めるか、役員に相談する）

### make deploy が使えないとき（手で更新する）

```bash
cd ~/sysken-pay/sysken-pay-backend
make backup                          # 先にバックアップ
cd ~/sysken-pay
git pull --ff-only
cd sysken-pay-backend
docker compose up -d --build
make migrate-up                      # db/migrations/ が増えたとき
cd ../sysken-pay-front
pnpm install --frozen-lockfile       # ERR_PNPM_IGNORED_BUILDS が出ても続けてよい
pnpm build                           # ✓ built と出ること
sudo systemctl restart sysken-pay-front
```

- 1行ずつ打つ（`&&` でつなぐと、`pnpm install` の `ERR_PNPM_IGNORED_BUILDS` で後ろが実行されない）
- キオスクの画面は、フロントを再起動すると自動で読み込み直される（読み込み直されなければ `pkill -f chromium`）

## 古いラズパイを今の main に追いつかせる（1 回だけ）

`make deploy` が使える前から動いているラズパイを、最初に1回だけ今の `main` に追いつかせる手順。**この順に、1つずつ**。`make migrate-up` や `make deploy` は、一覧の表（`schema_migrations`）がないと止まるので、先に人が印をつける。

1. バックアップ：`cd ~/sysken-pay/sysken-pay-backend && make backup`
2. 最新のコードを取る：`cd ~/sysken-pay && git pull --ff-only`（`deploy.sh` などが手元に来る）
3. DB がどこまで進んでいるか、**読むだけのコマンドで**調べる（DB は変えない）
   - `make migrate-status`（表がないので、すべて「まだ」と出るのが正しい）
   - `docker exec sysken-db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "SHOW TABLES; SHOW COLUMNS FROM user" sysken_pay'`
   - `db/migrations/` のファイルと見比べて、どこまで当たっているか決める（例：`payment_card` の表があれば 001、`refund` の表があれば 003、`user` に `hidden_at` 列があれば 004、`payment_card_claim` の表が**ない**なら 005 も当たっている、`item` に `disabled_at` 列があれば 006）。**番号は、ここで調べた結果から決める**（先に決めておかない）
4. 印をつける：`make migrate-baseline UPTO=<調べた番号>`（例：`UPTO=006`）。出た一覧を見て `yes`
   - 印がつくのは「当たっている」と調べたところまで。まだのもの（例：006）は、あとの `make deploy` が当てる
5. `.env` の確認（**中身は見ない・人に見せない。名前だけ**）
   - 見本は `.env.sample`。それと見比べて、**足りない名前がないか**だけ確かめる
   - バック（`sysken-pay-backend/.env`）の名前の例：`MYSQL_ROOT_PASSWORD`、`ADMIN_USER`、`ADMIN_PASSWORD`、`CHARGE_PASSWORD`、`ALLOWED_ORIGINS`、`PORT`、`API_BIND_ADDR`
   - フロント（`sysken-pay-front/.env`）の名前の例：`VITE_API_URL`、`VITE_QR_ENDPOINT`
   - 古いラズパイには、あとから増えた名前（`CHARGE_PASSWORD`・`VITE_QR_ENDPOINT` など）が足りないことがある。足りなければ `.env` に書き足す（値は役員が決める）
6. Slack の設定（上の「12.」）：`~/.config/sysken-pay/notify.env` を置いて、**テストの1通が届くこと**を確かめる（`make deploy` の成功・失敗がここに届く）
7. `cd ~/sysken-pay/sysken-pay-backend && DRY_RUN=1 make deploy` で、何をするか見る → よければ `make deploy`
8. 最後に確かめる：`curl -i localhost:8080/v1/health` が `200` で `OK` を返すこと
9. （やらなくてもよい。部室に人がいないとき）DB が止まったときの動きを確かめる：`docker compose stop sysken-db` → `curl -i localhost:8080/v1/health` が `503` で `NG` → `docker compose start sysken-db` で戻す。**`down` や `-v` は使わない**

- 途中で失敗したら、そこで止めて、上の「失敗したとき」と `back-safe-rollback` に従う
- 2回目以降は、この手順は不要（更新のたびに `make deploy` だけ）

## まだやっていないこと

終わったら、この一覧から消す（または「済」にする）。

### 作るもの（コード）

- [x] チャージのパスワードと、管理者画面（設定）のパスワードを分ける（`CHARGE_PASSWORD` を追加。ラズパイの `.env` に書くこと）
- [ ] ラズパイで漢字・ひらがなを打てるようにする（日本語入力 Mozc）
  - 入れるスクリプトは用意した（上の「11.」）。ラズパイで入れて、キオスクの画面で `Ctrl + Space` で切り替わるか確かめる
  - タッチ画面だけで打つには、画面に出すキーボードも要る（今は USB キーボードか Raspberry Pi Connect でしか打てない）
  - 打てるようになったら、ユーザー登録・更新の名前の入力欄の例を `k24000_シス研太郎` に戻す（今は `k24000_yamadataro`）
- [x] フロントの lint のエラー（`vite.config.ts` の triple-slash reference）を直す（動きには関係ない）

### ラズパイに入れて確かめること

- [x] 最新の main を入れる（DB の変更 `003_refund.sql`・`004_user_hidden.sql` も流す）
- [ ] **支払い・チャージはスマホのバーコードだけになった（学生証では払えない）**。入れる前に
  - [ ] 使う人全員のスマホにバーコードを入れる（管理サイトの「ユーザー」一覧で、「バーコードなし」の札が付いている人がまだの人）
  - [x] スマホに保存したバーコードを、部室のリーダーで読めるか確かめる
- [x] 本物の DB で、試し用のユーザーを使って確かめる：返金（残高がちょうど 0 になる）・利用停止（止めた人は払えない）・利用を再開・学籍番号の変更（残高・履歴・バーコードが引き継がれる）

### 運用を始める前に

- [ ] 5インチのタッチモニターをつないでの確認（800x480 で全画面になるか、タッチが効くか）
- [ ] バックアップのラズパイの外（Google Drive）への保存（「13. Google Drive にバックアップを送る」。rclone の設定がまだ）
- [ ] `sudo apt upgrade` でラズパイを最新にする
- [ ] 管理者（`ADMIN_PASSWORD`）とチャージ（`CHARGE_PASSWORD`）のパスワードを、`change-me` から役員が決めた別々のものに変えてあるか確かめる

### だれかに頼むこと

- [ ] ルーターの予約の登録し直し（ルーターに登録されている MAC アドレスが、ラズパイの Wi-Fi のものと違った。今はラズパイ側で固定しているので動いてはいる）
