# Skills（バックエンド）

`sysken-pay-backend` 専用の Claude Code スキル。kajiLabTeam/kakureru のスキルをもとに、シス研Pay のバック（Go + MySQL、お金を扱う API）向けに書き直したもの。フロントエンド用は `../../../sysken-pay-front/.claude/skills/` にある。

| スキル | 概要 |
|---|---|
| [back-safe-rollback](back-safe-rollback/SKILL.md) | API・DB が壊れた・残高がおかしいときの復旧手順。コードは退避→revert、DB は先に mysqldump で退避してから。`docker compose down` を使わない。 |
| [back-go-live-checklist](back-go-live-checklist/SKILL.md) | 本番に反映する前の監査。API の認証、CORS、ポートの公開範囲、金額の検証、DB の永続化とバックアップを棚卸しする。 |
| [back-health-check](back-health-check/SKILL.md) | 「健康診断して」で発動。Go の脆弱性・vet・テスト・OpenAPI と実装のずれ・DB の永続化を優先度付きで報告。 |
| [back-task-intake](back-task-intake/SKILL.md) | API・DB のタスクを issue にする。お金に関わる懸念は必ず解消してから起票する。 |

スキルを追加したらこの表に1行足す。名前は `back-` で始める。`description` は毎セッション読み込まれるので、いつ発動するかに絞って書く。

## kakureru から持ってこなかったもの

- `night-run-hearing` / `night-run-status`: 夜間自律実行の仕組みがこのリポジトリに無いため
- `claude-project-setup`: Flutter 向けの手順だったため。settings・hooks・CLAUDE.md は直接用意した
- `ui-mockup-reference`: kakureru のモック専用だったため、フロントの `front-pi-display-ui` に置き換えた
