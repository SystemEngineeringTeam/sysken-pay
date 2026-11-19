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
curl -s localhost:8080/v1/health; echo    # OK
docker exec sysken-db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "SHOW TABLES" sysken_pay' 2>/dev/null
```

新しく作る DB には `db/init.sql` がすべて入るので、`make migrate` は不要。

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
./scripts/backup-db.sh    # 手動で1回取って、動くことを確かめる
ls -lh backups/
(crontab -l 2>/dev/null; echo "0 3 * * * cd /home/sysken-pay/sysken-pay/sysken-pay-backend && ./scripts/backup-db.sh >> backups/backup.log 2>&1") | crontab -
crontab -l    # 0 3 * * * の行が1つだけあること
```

- 毎日 3:00 に `backups/` へ保存し、新しい順に30日分を残す。結果は `backups/backup.log`
- バックアップには部員の個人情報と残高が入るので、ファイルは自分だけが読める権限で作られる
- このままだと SD カードの中にしかない。USB メモリなど、ラズパイの外にもコピーすること（未設定）

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

## 9. スマホ登録の入口を開ける

スマホで QR を読んだときに開く「支払い用バーコードを受け取るページ」の入口（ポート 8081）を、部室の Wi-Fi に開ける。
開くのはこのページと受け取り API だけで、購入などの API は今まで通りラズパイの中からしか届かない。

```bash
cd ~/sysken-pay/sysken-pay-backend
nano .env    # 下の2行を書く（<IP> は 8. で固定した IP アドレス）
#   CLAIM_BIND_ADDR=0.0.0.0
#   PUBLIC_BASE_URL=http://<IP>:8081
docker compose up -d --build
```

確認：

```bash
docker compose ps                                                       # 0.0.0.0:8081->8081 が出ること
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/claim    # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/v1/health # 404（API は出ていない）
```

- 部室の Wi-Fi につないだスマホで `http://<IP>:8081/claim` を開くと「QR コードをもう一度読み取ってください」と出れば、入口は届いている
- 管理メニュー →「バーコード再発行」（またはユーザー登録の続き）で QR を出して、スマホで読み取れることを確かめる

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

## 更新するとき

1行ずつ打つ（`&&` でつなぐと、`pnpm install` の `ERR_PNPM_IGNORED_BUILDS` で後ろが実行されない）。

```bash
cd ~/sysken-pay/sysken-pay-backend
make backup                          # 先にバックアップ
cd ~/sysken-pay
git pull
cd sysken-pay-backend
docker compose up -d --build
cd ../sysken-pay-front
pnpm install --frozen-lockfile       # ERR_PNPM_IGNORED_BUILDS が出ても続けてよい
pnpm build                           # ✓ built と出ること
sudo systemctl restart sysken-pay-front
```

- DB の表が増える変更（`db/migrations/` にファイルが増えた）ときは、`docker compose up` の前に `make migrate FILE=...`（`sysken-pay-backend/README.md`）
- キオスクの画面は、フロントを再起動すると自動で読み込み直される（読み込み直されなければ `pkill -f chromium`）

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
  - [ ] 使う人全員のスマホにバーコードを入れる（「ユーザー設定 → 一覧」の「バーコードなし」で、まだの人が分かる）
  - [x] スマホに保存したバーコードを、部室のリーダーで読めるか確かめる
- [x] 本物の DB で、試し用のユーザーを使って確かめる：返金（残高がちょうど 0 になる）・利用停止（止めた人は払えない）・利用を再開・学籍番号の変更（残高・履歴・バーコードが引き継がれる）

### 運用を始める前に

- [ ] 5インチのタッチモニターをつないでの確認（800x480 で全画面になるか、タッチが効くか）
- [ ] バックアップのラズパイの外（USB メモリなど）への保存
- [ ] `sudo apt upgrade` でラズパイを最新にする
- [ ] 管理者（`ADMIN_PASSWORD`）とチャージ（`CHARGE_PASSWORD`）のパスワードを、`change-me` から役員が決めた別々のものに変えてあるか確かめる

### だれかに頼むこと

- [ ] ルーターの予約の登録し直し（ルーターに登録されている MAC アドレスが、ラズパイの Wi-Fi のものと違った。今はラズパイ側で固定しているので動いてはいる）
