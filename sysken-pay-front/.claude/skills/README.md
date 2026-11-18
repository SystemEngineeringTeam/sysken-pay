# Skills（フロントエンド）

`sysken-pay-front` 専用の Claude Code スキル。kajiLabTeam/kakureru のスキルをもとに、シス研Pay のフロント（React + 800x480 タッチ画面）向けに書き直したもの。バックエンド用は `../../../sysken-pay-backend/.claude/skills/` にある。

| スキル | 概要 |
|---|---|
| [front-pi-display-ui](front-pi-display-ui/SKILL.md) | 画面の見た目を触るときに発動。800x480 タッチ画面のルール（rem で書く・100vh を使わない・押しやすい大きさ）を守り、800x480 のスクショで確認してから終える。 |
| [front-safe-rollback](front-safe-rollback/SKILL.md) | 画面が壊れた・戻したいときの復旧手順。退避→切り分け→revert。ラズパイの画面を前のコミットで作り直す手順付き。 |
| [front-go-live-checklist](front-go-live-checklist/SKILL.md) | 本番に反映する前の監査。`VITE_` 変数の露出、確定ボタンの二重送信、800x480 の確認、キオスク設定を棚卸しする。 |
| [front-health-check](front-health-check/SKILL.md) | 「健康診断して」で発動。pnpm の脆弱性・lint・テスト・ビルド・lockfile・API 型定義のずれを優先度付きで報告。 |
| [front-task-intake](front-task-intake/SKILL.md) | 画面のタスクを issue にする。800x480 に収まるかを必ず確認してから起票する。 |

スキルを追加したらこの表に1行足す。名前は `front-` で始める（リポジトリ直下で Claude Code を開いたとき、バック用と名前がぶつからないように）。`description` は毎セッション読み込まれるので、いつ発動するかに絞って書く。
