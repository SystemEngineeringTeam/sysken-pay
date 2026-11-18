---
name: back-health-check
description: バックエンド（sysken-pay-backend の Go API・MySQL）の定期点検。「バックの健康診断して」「バックエンドの状態を確認して」「Goの依存を点検して」、またはリポジトリ全体の「健康診断して」で発動する（全体のときは front-health-check も合わせて実行する）。Go の脆弱性、vet・テスト・フォーマットの失敗、OpenAPI と実装のずれ、Docker イメージの古さ、DB バックアップの状況、Dependabot PR、CI の失敗を棚卸しし、優先度付きで報告する。
---

# Back Health Check

放置すると静かに危険が積み上がる項目をまとめて棚卸しする。目的は**やるべきことを優先度付きの短いリストにすること**。異常が無ければ「異常なし」と一言で終えてよい。

## Step 1: 安全網の自己点検

- `.claude/settings.json`（このディレクトリ）の `permissions.deny` に `rm -rf`、force push、`git reset --hard`、`docker compose down -v`、`docker volume rm` 等が残っているか
- `hooks` が `../.claude/hooks/deny_dangerous_bash.py` を指していて、ファイルが実在するか
- `python3 ../.claude/hooks/test_deny_dangerous_bash.py` が `0 failures` か

欠落があれば最優先で報告する。

## Step 2: 点検項目を集める

使えないもの（`gh` 未認証、Docker 無し等）はスキップし、**スキップしたことを報告に含める**。

**ローカル**

```
go mod verify
go vet ./...
go test ./...
gofmt -l .
go run golang.org/x/vuln/cmd/govulncheck@latest ./...
go list -m -u all
```

- **OpenAPI と実装のずれ**: `docs/openapi.yaml` のパス一覧と `app/server/router.go` のルーティングを突き合わせ、片方にしか無いエンドポイントがないか
- **Docker**: `Dockerfile` の `golang:x.y.z-alpine` が `go.mod` の go バージョンと合っているか、大きく古くなっていないか。`mysql:8` のタグが固定されていない点も報告する
- **DB の永続化**: `docker-compose.yaml` の `db` サービスに `/var/lib/mysql` のボリュームがマウントされているか（されていなければ「今すぐ対応」）
- 未コミットの変更（`git status -- .`）、未 push のコミット

**GitHub（`gh` CLI）**

```
gh pr list --author app/dependabot --state open --search "sysken-pay-backend"
gh run list --limit 10
gh pr list --state open
```

**本番（ラズパイ。ユーザーが確認できる場合）**

- 最後に DB のバックアップ（`mysqldump`）が取れたのはいつか
- ラズパイで動いているコミットが `main` からどれだけ遅れているか
- `docker compose ps` でコンテナが再起動を繰り返していないか

## Step 3: 優先度を付けて報告する

- **今すぐ対応**: 悪用可能な脆弱性、テストの失敗、安全網の欠落、DB が永続化されていない、DB バックアップが長期間取れていない
- **今週中に対応**: 中程度の脆弱性、Dependabot PR（CI が通っているものは取り込みを提案）、OpenAPI と実装のずれ、`go vet` の指摘
- **気に留めておく**: `gofmt` の差分、依存のメジャー更新、古いブランチ、Docker イメージの古さ

それぞれに「次の一手」を添える。Dependabot PR の取り込みは、CI 結果（無ければ `go test ./...`）を確認してから行う。

## Step 4: 記録する

点検日と主な結果を1〜3行で `docs/health-check-log.md`（このディレクトリ）に追記する（無ければ作成を提案）。前回の記録があれば差分を比較する。
