# CLAUDE.md（フロントエンド）

`sysken-pay-front` で Claude Code が作業するときの案内。安全ルールを含む全 AI エージェント共通の指示はリポジトリ直下の AGENTS.md にある。

@../AGENTS.md

## コマンド

```sh
pnpm install
pnpm dev                         # 開発サーバー。800x480 の枠で表示される
pnpm exec vitest run src/test    # 単体テスト（`pnpm test` は Storybook のブラウザテストも含む）
pnpm lint
pnpm build
pnpm generate:api                # ../sysken-pay-backend/docs/openapi.yaml から src/types/api-schema.d.ts を生成
pnpm preview:pi                  # ラズパイでの公開用（0.0.0.0:3000）
pnpm storybook
```

## 参照先

- 構成とレイヤー → `src/docs/ARCHITECTURE.md`
- 画面サイズ（800x480）の設定 → `src/index.css` の冒頭
- コードレビューの書式 → `.github/copilot-instructions.md`

## スキル

`.claude/skills/` にフロント用のスキルがある（一覧は `.claude/skills/README.md`）。

- 画面を触るとき → `front-pi-display-ui`
- 壊れた・戻したい → `front-safe-rollback`（API・DB が疑わしいときはバック側の `back-safe-rollback`）
- 本番に反映する前 → `front-go-live-checklist`
- 健康診断 → `front-health-check`
- issue の起票 → `front-task-intake`

破壊的コマンドは `.claude/settings.json` の deny と、リポジトリ直下の `.claude/hooks/deny_dangerous_bash.py` でブロックされる。
