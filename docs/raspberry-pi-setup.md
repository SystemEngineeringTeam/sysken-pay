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
nano .env    # ADMIN_PASSWORD を役員が決めたパスワードにする
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
docker exec sysken-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW TABLES" sysken_pay' 2>/dev/null
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

- `pnpm install` で `ERR_PNPM_IGNORED_BUILDS`（esbuild・@parcel/watcher）が出ても、`pnpm build` が `✓ built` になれば問題ない。気になれば `pnpm approve-builds` で2つとも許可する
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

## 7. 確認

- 再起動後、何も操作しなくてもシス研Pay の画面が全画面で出る
- 右上の歯車 → 管理者パスワードで管理メニューに入れる

## 更新するとき

```bash
cd ~/sysken-pay/sysken-pay-backend && make backup    # 先にバックアップ
cd ~/sysken-pay && git pull
cd sysken-pay-backend && docker compose up -d --build
cd ../sysken-pay-front && pnpm install --frozen-lockfile && pnpm build && sudo systemctl restart sysken-pay-front
```

- DB の表が増える変更（`db/migrations/` にファイルが増えた）ときは、`docker compose up` の前に `make migrate FILE=...`（`sysken-pay-backend/README.md`）
- キオスクの画面は、フロントを再起動すると自動で読み込み直される（読み込み直されなければ `pkill -f chromium`）

## まだやっていないこと

- 5インチのタッチモニターをつないでの確認（800x480 で全画面になるか、タッチが効くか）
- ルーターでの IP アドレスの固定割り当て（管理表の値と、実際に割り当てられている値が違った）
- DB のバックアップを毎日自動で取る設定（`sysken-pay-backend/README.md` の cron）と、ラズパイの外への保存
