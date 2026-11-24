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
pnpm preview:pi                  # 同じ LAN のほかの PC から見る確認用（0.0.0.0:3000）。ラズパイの本番は deploy/raspberry-pi/sysken-pay-front.service（127.0.0.1:3000）

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
- スキルはフロントとバックで分けて置いている。フロントは `sysken-pay-front/.claude/skills/`（`front-*`）、バックは `sysken-pay-backend/.claude/skills/`（`back-*`）。それぞれのディレクトリで Claude Code を開くと、そちらの CLAUDE.md・settings.json・スキルが使われる
- hook 本体（`.claude/hooks/`）はリポジトリ直下の1か所にあり、フロント・バックの settings.json からも `../.claude/hooks/` を参照している
