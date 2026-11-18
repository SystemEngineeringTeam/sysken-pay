# Skills

このディレクトリには、シス研Pay 専用の Claude Code スキル（`SKILL.md`）を置く。各スキルはサブディレクトリとして配置し、`<skill-name>/SKILL.md` に frontmatter（`name`, `description`）と手順を書く。kajiLabTeam/kakureru のスキルをもとに、シス研Pay（React + Go + MySQL、Raspberry Pi 5 + 800x480 タッチ画面）向けに書き直したもの。

## 一覧

| スキル | 概要 |
|---|---|
| [pi-display-ui](pi-display-ui/SKILL.md) | 画面の見た目を触るときに発動。800x480 のタッチ画面のルール（rem で書く・100vh を使わない・タッチしやすい大きさ）を守り、800x480 のスクリーンショットで確認してから終える。 |
| [safe-rollback](safe-rollback/SKILL.md) | 「壊れた」「元に戻したい」のときの復旧手順。破壊的コマンドを使わず、退避→切り分け→revert/切り戻し。ラズパイ本番と MySQL（残高データ）の巻き戻しにも対応。 |
| [go-live-checklist](go-live-checklist/SKILL.md) | 部室のラズパイで本番運用を始める前の監査。お金を動かす API の認証、ポートの公開範囲、DB の永続化とバックアップを棚卸しし、`/security-review` まで実行する。 |
| [project-health-check](project-health-check/SKILL.md) | 「健康診断して」で発動する定期点検。Dependabot・アラート・CI・pnpm/Go の脆弱性・テスト・放置ブランチを優先度付きで報告。 |
| [github-task-intake](github-task-intake/SKILL.md) | 「issueを起票して」で発動。Engineer/PM/PO/Designer/会計の観点でユーザーと一緒に詰めてから issue を作る。お金に関わる懸念は必ず解消してから起票する。 |

新しいスキルを追加したら、この表にも1行追記すること。frontmatter の `description` は全スキル分が毎セッション読み込まれるので、トリガー条件（いつ発動するか）に絞って書き、手順は本文に書く。

## kakureru から持ってこなかったもの

- `night-run-hearing` / `night-run-status`: 夜間自律実行の仕組み（`night-run/`）がこのリポジトリに無いため
- `claude-project-setup`: Flutter 向けの手順だったため。`.claude/settings.json`・hooks・`CLAUDE.md`・`AGENTS.md` は直接用意した
- `ui-mockup-reference`: kakureru のモック HTML 専用だったため、代わりに `pi-display-ui` を作った
