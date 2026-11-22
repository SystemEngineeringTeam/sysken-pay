#!/bin/sh
# deploy.sh のテスト。本物の Pi・docker・Slack は使わない。
# ローカルに origin と clone を作り、docker / pnpm / curl などは偽物に差し替えて、呼ばれた順番を確かめる。
#   sh deploy/raspberry-pi/test-deploy.sh
set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
# 一時フォルダは再帰削除しない（安全ルール）。OS の一時領域に残るだけで害はない
WORK="$(mktemp -d)"
FAIL=0
N=0

export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@example.invalid GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@example.invalid
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null

mkdir -p "$WORK/bin"
fake() { # 名前 中身（$STATE/calls に呼ばれた記録を残す）
  printf '#!/bin/sh\n%s\n' "$2" >"$WORK/bin/$1"
  chmod +x "$WORK/bin/$1"
}
fake docker 'echo "docker $*" >>"$STATE/calls"'
fake pkill 'echo "pkill $*" >>"$STATE/calls"; exit 1'
fake flock '[ "${FLOCK_BUSY:-}" = "1" ] && exit 1; exit 0'
fake pnpm 'echo "pnpm $*" >>"$STATE/calls"
case "$*" in
  *build*) [ "${PNPM_FAIL:-}" = "build" ] && exit 1
           mkdir -p dist-new; echo new >dist-new/marker ;;
esac
exit 0'
fake curl 'url=""; for a in "$@"; do url="$a"; done
echo "curl $url" >>"$STATE/calls"
case "$url" in *"${CURL_FAIL_MATCH:-NEVER_MATCH}"*) exit 22 ;; esac
exit 0'
fake notify 'echo "notify $*" >>"$STATE/calls"'
fake backup 'echo "backup BACKUP_DIR=$BACKUP_DIR KEEP=$KEEP" >>"$STATE/calls"'
fake migrate 'echo "migrate $* SKIP_BACKUP=${SKIP_BACKUP:-}" >>"$STATE/calls"
[ "${MIGRATE_FAIL:-}" = "1" ] && exit 1
exit 0'
fake systemctl 'echo "systemctl $*" >>"$STATE/calls"'

# 新しいケースを作る: origin（bare）・pi（動かす側の clone）・dev（変更を足す側の clone）
setup() {
  N=$((N + 1))
  C="$WORK/case$N"
  STATE="$C/state"
  mkdir -p "$STATE"
  : >"$STATE/calls"
  export STATE
  git init -q --bare -b main "$C/origin.git"
  git clone -q "$C/origin.git" "$C/dev" 2>/dev/null
  (
    cd "$C/dev"
    mkdir -p deploy/raspberry-pi sysken-pay-front/src sysken-pay-backend/db/migrations \
      sysken-pay-backend/docs sysken-pay-backend/scripts docs sysken-pay-qr
    cp "$HERE/deploy.sh" deploy/raspberry-pi/deploy.sh
    echo a >sysken-pay-front/src/a.ts
    echo a >sysken-pay-front/package.json
    echo a >sysken-pay-front/pnpm-lock.yaml
    echo a >sysken-pay-backend/main.go
    echo a >sysken-pay-backend/Makefile
    echo a >sysken-pay-backend/README.md
    echo a >sysken-pay-backend/docs/openapi.yaml
    echo a >sysken-pay-backend/scripts/x.sh
    echo a >sysken-pay-backend/db/migrations/001_a.sql
    echo a >docs/a.md
    echo a >README.md
    echo a >sysken-pay-qr/a.txt
    git add -A
    git commit -q -m init
    git push -q origin main 2>/dev/null
  )
  git clone -q "$C/origin.git" "$C/pi" 2>/dev/null
  # 今動いている dist（git では管理しない）と node_modules
  mkdir -p "$C/pi/sysken-pay-front/dist" "$C/pi/sysken-pay-front/node_modules"
  echo old >"$C/pi/sysken-pay-front/dist/marker"
}
# 上流（origin）に、指定したファイルを変えたコミットを足す
upstream() {
  (
    cd "$C/dev"
    for f in "$@"; do
      mkdir -p "$(dirname "$f")"
      echo change >>"$f"
    done
    git add -A
    git commit -q -m change
    git push -q origin main 2>/dev/null
  )
}
# deploy.sh を動かす。引数は「環境変数=値」。出力は $STATE/out、終了コードは RC
run() {
  RC=0
  env PATH="$WORK/bin:$PATH" STATE="$STATE" \
    NOTIFY_CMD="$WORK/bin/notify" BACKUP_CMD="$WORK/bin/backup" MIGRATE_CMD="$WORK/bin/migrate" \
    SYSTEMCTL_CMD="$WORK/bin/systemctl" LOCK_FILE="$STATE/lock" KIOSK_FLAG="$STATE/kiosk-disabled" \
    HEALTH_URL=http://health.invalid/v1/health FRONT_URL=http://front.invalid \
    HEALTH_TRIES=3 HEALTH_INTERVAL=0 "$@" \
    sh "$C/pi/deploy/raspberry-pi/deploy.sh" >"$STATE/out" 2>&1 || RC=$?
}
check() { # 名前 結果（0 なら成功）
  if [ "$2" -eq 0 ]; then echo "ok: $1"; else echo "NG: $1"; FAIL=1; fi
}
called() { grep -q -- "$1" "$STATE/calls"; }
said() { grep -q -- "$1" "$STATE/out"; }
line() { grep -n -- "$1" "$STATE/calls" | head -1 | cut -d: -f1; }
# 呼ばれた順番: $1 が $2 より先
before() { a="$(line "$1")"; b="$(line "$2")"; [ -n "$a" ] && [ -n "$b" ] && [ "$a" -lt "$b" ]; }
at_origin() { [ "$(git -C "$C/pi" rev-parse HEAD)" = "$(git -C "$C/origin.git" rev-parse main)" ]; }
no_calls() { [ ! -s "$STATE/calls" ]; }

# 1. 更新がないとき: 端末にだけ出す。Slack には送らない
setup; run
r=0; [ "$RC" -eq 0 ] || r=1; check "更新なし: 終了コード 0" $r
r=0; said "更新はありません" || r=1; check "更新なし: メッセージ" $r
r=0; no_calls || r=1; check "更新なし: Slack も docker も呼ばない" $r

# 2. docs だけ
setup; upstream docs/a.md; run
r=0; [ "$RC" -eq 0 ] || r=1; check "docs のみ: 終了コード 0" $r
r=0; said "ドキュメントだけの更新です（再起動なし）" || r=1; check "docs のみ: メッセージ" $r
r=0; no_calls || r=1; check "docs のみ: 再起動も Slack もしない" $r
r=0; at_origin || r=1; check "docs のみ: pull はする" $r

# 3. qr / README だけ
setup; upstream sysken-pay-qr/a.txt README.md; run
r=0; [ "$RC" -eq 0 ] && said "入れ替えるものはありません" || r=1; check "qr/README のみ: 何もしない" $r
r=0; no_calls || r=1; check "qr/README のみ: 再起動も Slack もしない" $r

# 4. フロントだけ
setup; upstream sysken-pay-front/src/a.ts; run
r=0; [ "$RC" -eq 0 ] || r=1; check "フロント: 終了コード 0" $r
r=0; called "pnpm build --outDir dist-new" || r=1; check "フロント: dist-new にビルド" $r
r=0; ! called "pnpm install" || r=1; check "フロント: lock が同じなら install しない" $r
r=0; [ "$(cat "$C/pi/sysken-pay-front/dist/marker")" = "new" ] || r=1; check "フロント: dist が新しくなる" $r
r=0; [ "$(cat "$C/pi/sysken-pay-front/dist-new/marker")" = "old" ] || r=1; check "フロント: 古い dist は dist-new に残る（消さない）" $r
r=0; called "systemctl restart sysken-pay-front" || r=1; check "フロント: sysken-pay-front を再起動" $r
r=0; called "pkill -f chromium" || r=1; check "フロント: Chromium を開き直す" $r
r=0; called "notify ok 更新しました（" || r=1; check "フロント: 成功を Slack に 1 行" $r
r=0; ! called "backup" && ! called "docker" || r=1; check "フロント: バックアップも docker も触らない" $r

# 5. pnpm-lock が変わったとき
setup; upstream sysken-pay-front/pnpm-lock.yaml; run
r=0; before "pnpm install --frozen-lockfile" "pnpm build" || r=1; check "lock 変更: install してからビルド" $r

# 6. バックだけ: ビルド → バックアップ → migration → up → health
setup; upstream sysken-pay-backend/main.go; run
r=0; [ "$RC" -eq 0 ] || r=1; check "バック: 終了コード 0" $r
r=0; before "docker compose build" "backup" || r=1; check "バック: ビルドが先" $r
r=0; before "backup" "migrate" || r=1; check "バック: バックアップのあとに migration" $r
r=0; before "migrate" "docker compose up -d" || r=1; check "バック: migration のあとに入れ替え" $r
r=0; before "docker compose up -d" "curl http://health.invalid/v1/health" || r=1; check "バック: 入れ替えのあとに health" $r
r=0; called "backup BACKUP_DIR=$C/pi/sysken-pay-backend/backups/deploy KEEP=10" || r=1; check "バック: backups/deploy に新しい 10 件" $r
r=0; called "migrate up SKIP_BACKUP=1" || r=1; check "バック: migration は SKIP_BACKUP=1" $r
r=0; ! called "pnpm" && ! called "systemctl" || r=1; check "バック: フロントは触らない" $r

# 7. migration だけ: ビルドしないが、バックアップ → migration → health
setup; upstream sysken-pay-backend/db/migrations/002_b.sql; run
r=0; [ "$RC" -eq 0 ] && called "migrate up" && called "backup" || r=1; check "migration のみ: バックアップして当てる" $r
r=0; ! called "docker compose build" || r=1; check "migration のみ: ビルドしない" $r

# 8. バックの docs・scripts・Makefile だけ: 再起動しない
setup; upstream sysken-pay-backend/README.md sysken-pay-backend/docs/openapi.yaml sysken-pay-backend/scripts/x.sh sysken-pay-backend/Makefile; run
r=0; [ "$RC" -eq 0 ] && no_calls || r=1; check "バックの docs/scripts/Makefile のみ: 何もしない" $r

# 9. deploy/raspberry-pi が変わったとき（deploy.sh 自身も変わる）: ⚠️ を端末と Slack に
setup; upstream deploy/raspberry-pi/deploy.sh sysken-pay-front/src/a.ts; run
r=0; [ "$RC" -eq 0 ] || r=1; check "pi 変更: deploy.sh が書き換わっても最後まで動く" $r
r=0; said "⚠️ deploy/raspberry-pi が変わりました。手順書を見て入れ直してください" || r=1; check "pi 変更: 端末に ⚠️" $r
r=0; called "notify warn deploy/raspberry-pi が変わりました" || r=1; check "pi 変更: Slack にも warn" $r
setup; upstream deploy/raspberry-pi/sysken-pay-kiosk.sh; run
r=0; [ "$RC" -eq 0 ] && said "⚠️" && called "notify warn" && ! called "systemctl" || r=1; check "pi だけ変更: 警告のみで再起動しない" $r

# 10. フロントのビルド失敗: dist は元のまま、バックアップもしない、Slack に失敗
setup; upstream sysken-pay-front/src/a.ts sysken-pay-backend/main.go; run PNPM_FAIL=build
r=0; [ "$RC" -ne 0 ] || r=1; check "ビルド失敗: 異常終了" $r
r=0; [ "$(cat "$C/pi/sysken-pay-front/dist/marker")" = "old" ] || r=1; check "ビルド失敗: dist は元のまま" $r
r=0; ! called "backup" && ! called "docker compose up" && ! called "systemctl" || r=1; check "ビルド失敗: 何も入れ替えない" $r
r=0; called "notify fail make deploy が「フロントのビルド」で失敗しました" || r=1; check "ビルド失敗: Slack に失敗と段階" $r

# 11. migration の失敗: バックを入れ替えない
setup; upstream sysken-pay-backend/main.go; run MIGRATE_FAIL=1
r=0; [ "$RC" -ne 0 ] && ! called "docker compose up" || r=1; check "migration 失敗: 入れ替えない" $r
r=0; called "notify fail make deploy が「migration」で失敗しました" || r=1; check "migration 失敗: Slack に失敗" $r

# 12. health が OK にならない: 回数分だけ試して止まり、フロントは入れ替えない
setup; upstream sysken-pay-backend/main.go sysken-pay-front/src/a.ts; run CURL_FAIL_MATCH=health.invalid
r=0; [ "$RC" -ne 0 ] || r=1; check "health NG: 異常終了" $r
r=0; [ "$(grep -c "curl http://health.invalid" "$STATE/calls")" -eq 3 ] || r=1; check "health NG: HEALTH_TRIES 回だけ試す" $r
r=0; [ "$(cat "$C/pi/sysken-pay-front/dist/marker")" = "old" ] && ! called "systemctl" || r=1; check "health NG: フロントは入れ替えない" $r
r=0; called "notify fail make deploy が「バックエンドの health 確認" || r=1; check "health NG: Slack に失敗" $r

# 13. ~/.kiosk-disabled があるときは Chromium を触らない
setup; upstream sysken-pay-front/src/a.ts; : >"$STATE/kiosk-disabled"; run
r=0; [ "$RC" -eq 0 ] && called "systemctl restart" && ! called "pkill" && said "キオスクは止めてある" || r=1; check "kiosk-disabled: pkill しない" $r

# 14. 二重起動
setup; upstream sysken-pay-front/src/a.ts; run FLOCK_BUSY=1
r=0; [ "$RC" -ne 0 ] && said "更新中です" || r=1; check "二重起動: 「更新中です」で止まる" $r
r=0; no_calls || r=1; check "二重起動: Slack にも送らず何もしない" $r
r=0; ! at_origin || r=1; check "二重起動: pull もしない" $r

# 15. DRY_RUN
setup; upstream sysken-pay-front/src/a.ts sysken-pay-backend/main.go; run DRY_RUN=1
r=0; [ "$RC" -eq 0 ] && said "DRY_RUN" || r=1; check "DRY_RUN: 何をするか表示する" $r
r=0; no_calls || r=1; check "DRY_RUN: 何も実行しない" $r
r=0; ! at_origin || r=1; check "DRY_RUN: pull しない" $r

# 16. フロントとバック両方: ビルド（フロント → バック）→ バックアップ → migration → バック → フロント
setup; upstream sysken-pay-front/src/a.ts sysken-pay-backend/main.go sysken-pay-backend/db/migrations/002_b.sql; run
r=0; [ "$RC" -eq 0 ] || r=1; check "両方: 終了コード 0" $r
r=0
before "pnpm build" "docker compose build" || r=1
before "docker compose build" "backup" || r=1
before "backup" "migrate" || r=1
before "migrate" "docker compose up -d" || r=1
before "docker compose up -d" "curl http://health.invalid" || r=1
before "curl http://health.invalid" "systemctl restart" || r=1
before "systemctl restart" "pkill" || r=1
check "両方: 決めた順番どおり" $r
r=0; [ "$(grep -c '^notify' "$STATE/calls")" -eq 1 ] || r=1; check "両方: Slack は成功の 1 行だけ" $r

# 17. dist-tmp が残っているとき: 入れ替えずに止まる（消さない）
setup; upstream sysken-pay-front/src/a.ts; mkdir -p "$C/pi/sysken-pay-front/dist-tmp"; run
r=0; [ "$RC" -ne 0 ] && ! called "systemctl" && [ "$(cat "$C/pi/sysken-pay-front/dist/marker")" = "old" ] || r=1; check "dist-tmp あり: 止まる" $r

# 18. dist がまだ無いとき: dist-new をそのまま dist にする
setup; upstream sysken-pay-front/src/a.ts; mv "$C/pi/sysken-pay-front/dist" "$C/pi/sysken-pay-front/dist-gone"; run
r=0; [ "$RC" -eq 0 ] && [ "$(cat "$C/pi/sysken-pay-front/dist/marker")" = "new" ] || r=1; check "dist なし: dist-new が dist になる" $r

if [ "$FAIL" -eq 0 ]; then echo "すべて成功"; else echo "失敗あり"; exit 1; fi
