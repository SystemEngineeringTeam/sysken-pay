# シス研Pay バックエンド

Go（chi）の API と MySQL 8 を docker compose で動かします。

## 起動・停止

```bash
make up       # ビルドして起動
make logs     # ログを見る
make down     # 停止（コンテナを消す。DB のデータは残る）
make restart  # 再起動
make login    # MySQL にログイン
```

`.env.sample` をコピーして `.env` を作り、値を設定してから起動してください。

| 変数 | 説明 |
|---|---|
| `ADMIN_PASSWORD` | 管理者・チャージ画面のパスワード。**未設定だと管理系 API はすべて 401 になる** |
| `ADMIN_USER` | BASIC 認証のユーザー名（既定 `admin`。フロントは `admin` で送るので通常は変えない） |
| `ALLOWED_ORIGINS` | CORS で許可するフロントの配信元（カンマ区切り）。未設定なら `localhost:5173` / `localhost:3000` |
| `API_BIND_ADDR` | API をどこから届くようにするか。既定 `127.0.0.1`（ラズパイの中だけ）。フロントを別の PC で動かすときだけ `0.0.0.0` |

## 認証

お金を動かす・登録内容を変える API は BASIC 認証（`ADMIN_USER` / `ADMIN_PASSWORD`）が必要です。

- 認証が必要: ユーザー登録・更新、商品登録・更新、チャージ、チャージ取消、購入取消、`GET /v1/admin/verify`
- 認証なし（キオスクで部員が使う）: ユーザー・残高・履歴・商品の取得、購入、ヘルスチェック

MySQL（53306）はラズパイの中からだけ届きます。

## DB のデータについて

- DB のデータは docker のボリューム `mysql_data` に保存されます。`make down` や `make up` でコンテナを作り直しても消えません
- **`docker compose down -v` と `docker volume rm` はデータごと消えるので使わないでください**
- コンテナは `restart: unless-stopped` なので、ラズパイを再起動すると自動で立ち上がります（docker 自体が自動起動する設定になっていること）
- `db/init.sql` は **ボリュームが空のとき（最初の起動時）だけ** 実行されます。あとから `init.sql` を書き換えても、今ある DB には反映されません

## バックアップ

```bash
make backup
```

- `backups/sysken_pay-<日時>.sql.gz` に保存されます（`backups/` は Git に入りません）
- 新しい順に 30 件まで残し、それより古いものは消します（`KEEP=60 make backup` のように変えられます）
- 保存先を変えるときは `BACKUP_DIR=/mnt/usb/sysken make backup`。SD カードが壊れたときに備えて、**ラズパイの外（USB メモリなど）にも置く**のがおすすめです

### 毎日自動で取る（cron）

ラズパイで `crontab -e` を開き、次の1行を足します（毎日 3:00 に実行）。パスは実際の置き場所に合わせてください。

```cron
0 3 * * * cd /home/pi/sysken-pay/sysken-pay-backend && ./scripts/backup-db.sh >> backups/backup.log 2>&1
```

### バックアップから戻す

```bash
make restore FILE=backups/sysken_pay-20261118-030000.sql.gz
```

- 今の DB は上書きされます。実行すると、まず今の状態のバックアップを自動で取り、`yes` と入力したときだけ戻します

## すでにデータが入っている環境でこの設定を反映するとき

この設定（`mysql_data` ボリューム）が入る前から動いている環境では、データはまだコンテナの中にしかありません。そのまま `make up` すると、**空の DB で作り直されます**。次の順で反映してください。

1. 古い設定のまま `make backup` で今のデータを保存する（`backups/` にファイルができたことを確認）
2. 新しい設定を取り込んで `make up`（空の DB が作られる）
3. `make restore FILE=backups/<1で保存したファイル>` でデータを戻す
4. 画面で残高・ユーザーが戻っていることを確認する

## テスト

```bash
go vet ./...
go test ./...
```
