---
name: project-health-check
description: シス研Pay の定期点検（健康診断）。「健康診断して」「ヘルスチェックして」「プロジェクトの状態を確認して」「しばらく触ってなかったので点検して」といった依頼で発動する。Dependabot の更新PR、セキュリティアラート、CI の失敗、フロント（pnpm）とバック（Go）の依存の脆弱性、テストの失敗、放置ブランチ・PR、安全網の劣化をまとめて棚卸しし、優先度付きで報告する。
---

# Project Health Check

放置すると静かに危険が積み上がる項目を、まとめて棚卸しするスキル。目的は**やるべきことを優先度付きの短いリストにして、次の行動につなげる**こと。異常が無ければ「異常なし」と一言で終えてよい。

## Step 1: 安全網の自己点検

安全網は消えても何も起きない（守られなくなるだけ）ので、定期点検でしか気づけない。

- `.claude/settings.json` の `permissions.deny` に `rm -rf`、force push、`git reset --hard`、`docker compose down -v` 等が残っているか
- `hooks` に `deny_dangerous_bash.py` が設定され、ファイルが実在するか
- `python3 .claude/hooks/test_deny_dangerous_bash.py` が `0 failures` か

欠落があれば、それがこの点検の最優先の報告事項。

## Step 2: 点検項目を集める

使えないもの（`gh` 未認証等）はスキップし、**スキップしたことを報告に含める**（見ていない項目を「問題なし」と誤解させない）。

**GitHub（`gh` CLI）**

```
gh pr list --author app/dependabot --state open
gh api repos/SystemEngineeringTeam/sysken-pay/dependabot/alerts --jq '[.[] | select(.state=="open")] | length'
gh run list --limit 10
gh pr list --state open
```

**フロント（`sysken-pay-front`）**

```
pnpm install --frozen-lockfile
pnpm audit --prod
pnpm lint
pnpm exec vitest run src/test
pnpm build
```

- `package-lock.json` と `pnpm-lock.yaml` が両方あるので、どちらが正か食い違っていないか（pnpm を使う前提。`npm install` で `package-lock.json` だけ更新された形跡があれば報告する）
- `src/types/api-schema.d.ts` が `docs/openapi.yaml` と一致しているか（`pnpm generate:api` 後に `git diff` が出ないか）

**バック（`sysken-pay-backend`）**

```
go vet ./...
go test ./...
go run golang.org/x/vuln/cmd/govulncheck@latest ./...
gofmt -l .
```

- `Dockerfile` の Go イメージ（`golang:x.y.z-alpine`）が `go.mod` の go バージョンと合っているか、大きく古くなっていないか

**ローカルの Git**

- 未コミットの変更（`git status`）、未 push のコミット（`git log @{u}..`）
- マージ済み・長期間更新のないブランチ（**削除はしない**、報告だけ）

**本番（ラズパイ。ユーザーが確認できる場合）**

- 最後に DB のバックアップ（`mysqldump`）が取れたのはいつか
- ラズパイで動いているコミットが `main` からどれだけ遅れているか

## Step 3: 優先度を付けて報告する

- **今すぐ対応**: high/critical のセキュリティアラート、失敗し続ける CI、テストの失敗、安全網の欠落、DB バックアップが長期間取れていない
- **今週中に対応**: Dependabot の更新 PR（CI が通っているものは取り込みを提案）、中程度の脆弱性、放置 PR、OpenAPI と型定義のずれ
- **気に留めておく**: 古いブランチ、未 push コミット、lint の警告

それぞれに「次の一手」を添える（例: 「『Dependabot の PR を取り込んで』と言ってもらえれば、CI を確認してから取り込みます」）。Dependabot PR の取り込みは、必ず CI 結果（無ければローカルのテスト）を確認してから行う。

## Step 4: 記録する

点検日と主な結果を1〜3行で `docs/health-check-log.md` に追記する（無ければ作成を提案）。前回からの差分（「先週2件だったアラートが5件」等）は、単発の数字より意味があるので、記録があれば必ず比較する。
