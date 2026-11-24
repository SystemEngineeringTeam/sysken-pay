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
| `ADMIN_PASSWORD` | 管理者画面のパスワード（チャージの画面にも入れる）。**未設定だと管理系 API はすべて 401 になる** |
| `CHARGE_PASSWORD` | チャージの画面のパスワード（管理者パスワードとは別にする）。チャージしかできない。未設定だとチャージの画面には管理者パスワードでしか入れない |
| `ADMIN_USER` | BASIC 認証のユーザー名（既定 `admin`。フロントは `admin` で送るので通常は変えない） |
| `ALLOWED_ORIGINS` | CORS で許可するフロントの配信元（カンマ区切り）。未設定なら `localhost:5173` / `localhost:3000` |
| `ENTRA_TENANT_ID` | 管理サイトの Entra ID ログインで受け入れるテナントの ID。**`ENTRA_CLIENT_ID` とどちらか未設定だと、Bearer（Entra のトークン）はすべて 401**。設計は `../docs/admin-entra-login.md` |
| `ENTRA_CLIENT_ID` | 管理サイトの Entra アプリ登録のクライアント ID（ID トークンの `aud`） |
| `API_BIND_ADDR` | API をどこから届くようにするか。既定 `127.0.0.1`（ラズパイの中だけ）。フロントを別の PC で動かすときだけ `0.0.0.0` |

## 認証

お金を動かす・登録内容を変える API は BASIC 認証（ユーザー名は `ADMIN_USER`）が必要です。

- チャージ用パスワード（`CHARGE_PASSWORD`）か管理者パスワード、管理者バーコードの Session（下記）で通る: チャージ、`GET /v1/charge/verify`
- 管理者パスワード（`ADMIN_PASSWORD`）か、Entra の ID トークン（`Authorization: Bearer`。許可リストにいる人だけ）で通る: それ以外のすべて（許可リストの編集 `/v1/admin/allowlist` も含む。ユーザー登録・更新・一覧・返金・利用停止、商品登録・更新、バーコードの発行、購入取消、`GET /v1/admin/verify` など）。Entra は PC の管理サイトだけが使う。ラズパイは今まで通りパスワードに加えて、**管理者に登録された人の支払い用バーコードをかざす**と短い間だけ解除できる（`POST /v1/admin/unlock` が返す `Authorization: Session <token>`。10 分で切れ、許可リストの編集・ユーザーの更新/削除/停止/再開/非表示/返金には使えない。`docs/phone-payment.md` の「管理者バーコードでの解除」）。許可リスト（`admin_allowlist`、migration `007`）の最初の 1 人は、管理者パスワードで管理サイトに入って足す
- 認証なし（キオスクで部員が使う）: ユーザー・残高・履歴・商品の取得、購入、支払い用バーコードの照合（`GET /v1/user?hri=`。失敗が続くと 429）、管理者バーコードでの解除と取り消し（`POST` / `DELETE /v1/admin/unlock`）、ヘルスチェック

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

## DB の変更（マイグレーション）

`db/init.sql` は最初の起動時にしか実行されません。すでに動いている DB にテーブルを足すときは、`db/migrations/` の SQL を `make migrate-up` で当てます。当てたファイル名は DB の `schema_migrations` 表（ファイル名・当てた日時）に記録されます。

```bash
make migrate-status    # 当てたもの・まだのものを一覧で出す（DB は変えない）
make migrate-up        # まだのものだけ、番号の順に当てる
```

- `make migrate-up` は、当てる前に自動で `make backup` を取ります（まだのものがあるときだけ）
- **1つ失敗したら、そこで止まります**。次のファイルは当てず、失敗したファイルには印をつけません
- **MySQL の `CREATE` / `ALTER` / `DROP` はトランザクションで戻せません**。失敗したファイルは、途中まで DB に反映されていることがあります。勝手に直さず、バックアップ（`backups/`）を確かめて、変更を作った人に連絡してください
- `db/migrations/` の SQL は何度流しても壊れないように書く（`CREATE TABLE IF NOT EXISTS` など）
- 新しく作る DB には `db/init.sql` の内容が入るので、テーブルを足したら `init.sql` にも同じものを足す
- 昔の `make migrate FILE=...` は廃止しました（打つと `make migrate-up` を使うように案内が出て止まります）
- 本番（ラズパイ）を新しくするときは、`make backup` → `make migrate-up` → API を作り直す、の順にする（`migrate-up` が番号の順にすべて当てるので、途中を飛ばして API が 500 になることを防げます）
- `006_item_disabled.sql` は `item.deleted_at` を `disabled_at` に改名します（データは変わりません）。**順番を逆にする（API を先に作り直す）と、新しい API が列名違いで 500 になります**。マイグレーションと API の入れ替えの数秒は、古い API が 500 を返すので、無人運転の時間帯を避けます

### 最初の1回だけ：今の DB に印をつける（`make migrate-baseline`）

`schema_migrations` 表がまだない DB（今動いているもの・`init.sql` から新しく作ったもの）では、`make migrate-up` は**止まります**（表がないまま当てると `001` から流し直してしまうため）。先に、**人が**「どこまで当たっているか」を確かめて、1回だけ印をつけます。

```bash
make migrate-baseline UPTO=004    # 001〜004 を「当てたことにする」印だけつける（SQL は流さない）
```

- 流すのは SQL ではなく**印だけ**。`yes` と入力したときだけ実行します（先に自動でバックアップを取ります）
- 番号は、DB に表・列があるかで確かめてから決める（`SHOW TABLES;`、`SHOW COLUMNS FROM user;`）。まだ DB にない変更を「当てた」ことにすると API が壊れる
- 表に印がもうあるときは、何もせず止まります
- `init.sql` から新しく作った DB は全部入っているので、一番大きい番号（今なら `UPTO=005`）にする

| ファイル | 内容 |
|---|---|
| `001_payment_card.sql` | 支払い用バーコードの表（`docs/phone-payment.md`） |
| `002_payment_card_claim.sql` | 発行用 QR の表（同上。005 で消える） |
| `003_refund.sql` | 返金の表（`docs/phone-payment.md` の「ユーザー一覧」） |
| `004_user_hidden.sql` | `user` に `hidden_at` を足す（停止中の人の「非表示」）。**API を新しくする前に流す**（流す前の API は一覧が 500 になる） |
| `005_drop_payment_card_claim.sql` | 発行用 QR の表 `payment_card_claim` を消す（発行用 QR をやめたため）。**`make backup` を取ってから、API を新しくする前に流す**（古い表が残っていると、ユーザーの削除・学籍番号の変更が外部キーで失敗することがある） |

## テスト

```bash
go vet ./...
go test ./...
./scripts/test-migrate.sh   # migrate.sh のテスト（本物の DB は使わない）
```
