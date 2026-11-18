# AGENTS.md

このリポジトリで作業するすべての AI コーディングエージェント（Claude Code, Codex, Cursor, Copilot 等）への共通指示。**安全に関わるルールの本体はこのファイルにある。**

## プロジェクト概要

**シス研Pay** — システム工学研究会の部室にある「シス研商店」の決済・購買管理アプリ。部員が学生証のバーコードで本人確認し、商品のバーコードを読んで購入する。残高のチャージ、管理者による商品・ユーザー登録もできる。

- フロント: `sysken-pay-front`（React 19 + TypeScript + Vite、Zustand、generouted、SCSS Modules）
- バック: `sysken-pay-backend`（Go + chi、MySQL 8、docker compose）
- 本番: 部室の **Raspberry Pi 5 + 5インチ DSI タッチモニター（800x480・横向き）** でキオスク表示
- **部員の学籍番号・氏名と、お金（残高・購入履歴）を扱う**。データの消失や残高のずれは取り返しがつかないものとして扱う

## 安全ルール（全エージェント共通）

1. **破壊的コマンドを実行しない**: `rm` の再帰+強制削除、`git push --force`（全変種）、`git reset --hard`、`git clean`、`docker compose down -v`、`docker volume rm`。取り消しは「追加する」操作（`git revert`、`git stash`、バックアップブランチ）だけで行う
2. **DB のデータを消さない**: 本番 DB に対して `DROP` / `TRUNCATE` / 条件なしの `DELETE` / `UPDATE` を実行しない。DB に触る前は必ず `mysqldump` で退避する。今の `docker-compose.yaml` は MySQL のデータをボリュームに保存していないため、**本番で `docker compose down` するとデータが消える**
3. **秘密情報を扱わない**: `.env` 系ファイル・秘密鍵を読まない・コミットしない・出力に含めない（`.env.sample` は可）
4. **安全網を弱めない**: `.claude/settings.json` の deny、`.claude/hooks/`、このファイルの安全ルールを黙って削除・緩和しない
5. **テストを添える**: 新機能・修正にはテストを付ける（フロント: `src/test/`、バック: 各パッケージの `*_test.go`）。書けない変更は手動での確認方法を報告に書く
6. **お金の計算は特に慎重に**: 金額・残高を変える処理は、二重送信・途中失敗（トランザクション）・負の値をテストで確かめる
7. **壊れた・元に戻したいと言われたら**: `.claude/skills/safe-rollback/SKILL.md` に従う
8. **本番運用・大きな変更の反映の前に**: `.claude/skills/go-live-checklist/SKILL.md` の監査を先に行う
9. **定期点検を頼まれたら**: `.claude/skills/project-health-check/SKILL.md` に従う

ランブックはただの Markdown 手順書なので、Claude Code 以外のツールでも読んで従える。Claude Code 固有の機能（`/security-review`、AskUserQuestion 等）は、使えないツールでは同等の代替で読み替える。

## コーディング規約

### フロント

- レイヤー構成は `sysken-pay-front/src/docs/ARCHITECTURE.md` に従う（adapter → services → hooks → store → pages/components）
- `src/types/api-schema.d.ts` と `src/router.ts` は自動生成。手で編集しない
- **画面は 800x480 のタッチ画面**。長さは rem で書き、`100vh` / `100vw` を使わない。詳しくは `.claude/skills/pi-display-ui/SKILL.md`
- コードレビューの書式は `sysken-pay-front/.github/copilot-instructions.md`（[MUST] / [SHOULD] / [MAY]）

### バック

- レイヤー構成: `app/ui/api`（ハンドラ）→ `app/usecase` → `app/domain`（object / service / repository インターフェース）→ `app/infra`（repository 実装・transaction）
- 複数テーブルを更新する処理（購入・チャージ等）は `transaction` を通す
- API を変えたら `docs/openapi.yaml` を更新し、フロントで `pnpm generate:api` を実行する
