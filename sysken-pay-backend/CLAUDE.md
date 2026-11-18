# CLAUDE.md（バックエンド）

`sysken-pay-backend` で Claude Code が作業するときの案内。安全ルールを含む全 AI エージェント共通の指示はリポジトリ直下の AGENTS.md にある。

@../AGENTS.md

## コマンド

```sh
make up                          # docker compose で API と MySQL を起動
make logs
go vet ./...
go test ./...
gofmt -l .
```

DB のデータは docker ボリューム `mysql_data` に保存される。`make down` では消えないが、`docker compose down -v` / `docker volume rm` では全データが消えるので使わない。バックアップは `make backup`、戻すのは `make restore FILE=...`（手順は README.md）。

## 参照先

- API 仕様 → `docs/openapi.yaml`（変えたらフロントで `pnpm generate:api`）
- DB スキーマ → `db/init.sql`（最初にコンテナを作るときだけ実行される）
- ルーティング → `app/server/server.go`

## スキル

`.claude/skills/` にバック用のスキルがある（一覧は `.claude/skills/README.md`）。

- 壊れた・戻したい・残高がおかしい → `back-safe-rollback`
- 本番に反映する前 → `back-go-live-checklist`
- 健康診断 → `back-health-check`
- issue の起票 → `back-task-intake`

破壊的コマンドは `.claude/settings.json` の deny と、リポジトリ直下の `.claude/hooks/deny_dangerous_bash.py` でブロックされる。
