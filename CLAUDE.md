# CLAUDE.md

このリポジトリで Claude Code が作業するときの案内。安全ルールを含む全 AI エージェント共通の指示は AGENTS.md にあり、ここで読み込む。**ルールの本体は AGENTS.md 側で変更する**（二重管理を防ぐため）。

@AGENTS.md

## コマンド

```sh
# フロント（sysken-pay-front）
pnpm install
pnpm dev                         # 開発サーバー。800x480 の枠で表示される
pnpm exec vitest run src/test    # 単体テスト（`pnpm test` は Storybook のブラウザテストも含む）
pnpm lint
pnpm build
pnpm generate:api                # docs/openapi.yaml から src/types/api-schema.d.ts を生成
pnpm preview:pi                  # ラズパイでの公開用（0.0.0.0:3000）

# バック（sysken-pay-backend）
make up                          # docker compose で API と MySQL を起動
go test ./...
go vet ./...
```

## 参照先

- フロントの構成とレイヤー → `sysken-pay-front/src/docs/ARCHITECTURE.md`
- API 仕様 → `sysken-pay-backend/docs/openapi.yaml`
- DB スキーマ → `sysken-pay-backend/db/init.sql`
- 画面サイズ（800x480）の設定 → `sysken-pay-front/src/index.css` の冒頭

## Claude Code 固有の補足

- AGENTS.md の安全ルール1（破壊的コマンド）は、`.claude/settings.json` の `permissions.deny` と `.claude/hooks/deny_dangerous_bash.py`（PreToolUse hook）で**強制**される。hook を変更したら `python3 .claude/hooks/test_deny_dangerous_bash.py` を必ず実行する
- ランブック（safe-rollback / go-live-checklist / project-health-check）と、画面作業用の pi-display-ui、起票用の github-task-intake はスキルとして自動発動する（一覧は `.claude/skills/README.md`）
