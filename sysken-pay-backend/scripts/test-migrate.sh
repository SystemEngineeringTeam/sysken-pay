#!/bin/sh
# migrate.sh のテスト。本物の DB・docker は使わず、偽の docker で表の動きを真似する。
#   ./scripts/test-migrate.sh
set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
# 一時フォルダは再帰削除しない（安全ルール）。OS の一時領域に残るだけで害はない
WORK="$(mktemp -d)"
FAIL=0

mkdir -p "$WORK/bin" "$WORK/migrations"
# 偽の docker: 標準入力の SQL を見て、$STATE の中のファイルで表の状態を真似する
cat >"$WORK/bin/docker" <<'D'
#!/bin/sh
SQL="$(cat)"
case "$SQL" in
  *information_schema*) [ -f "$STATE/table" ] && echo 1 || echo 0 ;;
  *"CREATE TABLE IF NOT EXISTS schema_migrations"*) touch "$STATE/table" ;;
  *"SELECT filename FROM schema_migrations"*) [ -f "$STATE/applied" ] && sort "$STATE/applied" || true ;;
  *"INSERT INTO schema_migrations"*) echo "$SQL" | sed "s/.*VALUES ('\(.*\)').*/\1/" >>"$STATE/applied" ;;
  *FAIL_ME*) echo "ERROR" >&2; exit 1 ;;
  *) echo "$SQL" | head -1 >>"$STATE/ran" ;;
esac
D
chmod +x "$WORK/bin/docker"
printf '#!/bin/sh\necho backup >>"$STATE/backups"\n' >"$WORK/backup.sh"
chmod +x "$WORK/backup.sh"

for n in 001_a 002_b 003_c; do echo "-- $n" >"$WORK/migrations/$n.sql"; done

N=0
# ケースごとに新しい状態フォルダを使う（消さずに、毎回別の場所にする）
setup() { N=$((N + 1)); STATE="$WORK/state$N"; mkdir -p "$STATE"; export STATE; }
m() {
  PATH="$WORK/bin:$PATH" MIGRATIONS_DIR="$WORK/migrations" BACKUP_CMD="$WORK/backup.sh" ASSUME_YES=1 \
    "$HERE/migrate.sh" "$@"
}
check() { # 名前 結果（0 なら成功）
  if [ "$2" -eq 0 ]; then echo "ok: $1"; else echo "NG: $1"; FAIL=1; fi
}
# コマンドが失敗すること（失敗したら 0 を返す）
fails() { if "$@" >/dev/null 2>&1; then return 1; else return 0; fi; }

# 1. 表がないとき up は止まり、SQL も流さずバックアップもしない
setup
r=0; fails m up || r=1; check "表なしの up は止まる" $r
r=0; { [ ! -f "$STATE/ran" ] && [ ! -f "$STATE/backups" ]; } || r=1; check "表なしの up は何も流さない" $r

# 2. status は DB を変えない（表を作らない）
m status >/dev/null
r=0; [ ! -f "$STATE/table" ] || r=1; check "status は表を作らない" $r

# 3. baseline は印だけつける（SQL を流さない）
m baseline 002 >/dev/null
r=0; [ "$(cat "$STATE/applied")" = "001_a.sql
002_b.sql" ] || r=1; check "baseline は 001〜002 に印" $r
r=0; [ ! -f "$STATE/ran" ] || r=1; check "baseline は SQL を流さない" $r

# 4. 印があるときの baseline は何もせず止まる
r=0; fails m baseline 003 || r=1; check "2回目の baseline は止まる" $r
r=0; [ "$(wc -l <"$STATE/applied" | tr -d ' ')" = "2" ] || r=1; check "2回目の baseline は印を増やさない" $r

# 5. up は まだのものだけ当てて、先にバックアップを取る
m up >/dev/null
r=0; [ "$(cat "$STATE/ran")" = "-- 003_c" ] || r=1; check "up はまだのものだけ流す" $r
r=0; [ -f "$STATE/backups" ] || r=1; check "up はバックアップを取る" $r
r=0; grep -qx "003_c.sql" "$STATE/applied" || r=1; check "up は印をつける" $r

# 6. もう無いときは何もしない（もう一度 up）
before="$(cat "$STATE/applied")"
m up >/dev/null
r=0; [ "$(cat "$STATE/applied")" = "$before" ] && [ "$(wc -l <"$STATE/ran" | tr -d ' ')" = "1" ] || r=1
check "まだのものが無ければ何もしない" $r

# 7. 失敗したらそこで止まり、印をつけず、次を当てない
setup
touch "$STATE/table"
echo "001_a.sql" >"$STATE/applied"
echo "-- FAIL_ME" >"$WORK/migrations/002_b.sql"
r=0; fails m up || r=1; check "失敗したら up は異常終了" $r
r=0; ! grep -qx "002_b.sql" "$STATE/applied" || r=1; check "失敗したファイルに印をつけない" $r
r=0; [ ! -f "$STATE/ran" ] || r=1; check "失敗のあとのファイルは流さない" $r

# 8. UPTO の形が正しくない・無い番号は止まる
setup
r=0; fails m baseline || r=1; check "UPTO なしは止まる" $r
r=0; fails m baseline 999 || r=1; check "無い番号は止まる" $r
r=0; [ ! -f "$STATE/table" ] || r=1; check "止まったときは表を作らない" $r

if [ "$FAIL" -eq 0 ]; then echo "すべて成功"; else echo "失敗あり"; exit 1; fi
