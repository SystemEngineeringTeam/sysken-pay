---
name: front-health-check
description: フロントエンド（sysken-pay-front）の定期点検。「フロントの健康診断して」「フロントの状態を確認して」「依存を点検して」、またはリポジトリ全体の「健康診断して」で発動する（全体のときは back-health-check も合わせて実行する）。依存の脆弱性、lint・テスト・ビルドの失敗、lockfile の食い違い、API 型定義のずれ、Dependabot PR、CI の失敗を棚卸しし、優先度付きで報告する。
---

# Front Health Check

放置すると静かに危険が積み上がる項目をまとめて棚卸しする。目的は**やるべきことを優先度付きの短いリストにすること**。異常が無ければ「異常なし」と一言で終えてよい。

## Step 1: 安全網の自己点検

- `.claude/settings.json`（このディレクトリ）の `permissions.deny` に `rm -rf`、force push、`git reset --hard` 等が残っているか
- `hooks` が `../.claude/hooks/deny_dangerous_bash.py` を指していて、ファイルが実在するか
- `python3 ../.claude/hooks/test_deny_dangerous_bash.py` が `0 failures` か

欠落があれば最優先で報告する。

## Step 2: 点検項目を集める

使えないもの（`gh` 未認証等）はスキップし、**スキップしたことを報告に含める**。

**ローカル**

```
pnpm install --frozen-lockfile
pnpm audit --prod
pnpm lint
pnpm exec vitest run src/test
pnpm build
pnpm outdated
```

- **lockfile の食い違い**: `package-lock.json` と `pnpm-lock.yaml` が両方ある。pnpm が正なので、`npm install` で `package-lock.json` だけ更新された形跡（`git log -1 -- package-lock.json` が `pnpm-lock.yaml` より新しい等）があれば報告する
- **API 型定義のずれ**: `pnpm generate:api` を実行して `git diff --stat src/types/api-schema.d.ts` に差分が出ないか。差分が出たら、バックエンドの API 変更にフロントが追いついていない
- **画面サイズの約束**: `grep -rn '100vh\|100vw' src --include=*.scss` が0件か（`front-pi-display-ui` のルール）
- 未コミットの変更（`git status -- .`）、未 push のコミット

**GitHub（`gh` CLI）**

```
gh pr list --author app/dependabot --state open --search "sysken-pay-front"
gh run list --limit 10
gh pr list --state open
```

## Step 3: 優先度を付けて報告する

- **今すぐ対応**: high/critical の脆弱性、テスト・ビルドの失敗、安全網の欠落、API 型定義のずれ（本番で画面が壊れる原因になる）
- **今週中に対応**: 中程度の脆弱性、Dependabot PR（CI が通っているものは取り込みを提案）、lint エラー、`100vh` の混入
- **気に留めておく**: `pnpm outdated` のメジャー更新、古いブランチ、lockfile の食い違い

それぞれに「次の一手」を添える。Dependabot PR の取り込みは、CI 結果（無ければローカルのテストとビルド）を確認してから行う。

## Step 4: 記録する

点検日と主な結果を1〜3行で `docs/health-check-log.md`（このディレクトリ）に追記する（無ければ作成を提案）。前回の記録があれば差分を比較する。
