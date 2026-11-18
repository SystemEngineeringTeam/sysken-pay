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

`.env` に `MYSQL_ROOT_PASSWORD` などを設定してから起動してください。

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
