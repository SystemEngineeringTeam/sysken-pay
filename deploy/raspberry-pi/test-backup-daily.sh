#!/bin/sh
# backup-daily.sh のテスト。本物の DB・rclone・Slack は使わず、偽物のコマンドで確かめる。
#   sh deploy/raspberry-pi/test-backup-daily.sh
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/backup-daily.sh"
PASS=0
FAIL=0

ok() { PASS=$((PASS + 1)); echo "ok   - $1"; }
ng() { FAIL=$((FAIL + 1)); echo "FAIL - $1"; }
check() { # check "名前" コマンド...
  name="$1"; shift
  if "$@"; then ok "$name"; else ng "$name"; fi
}
has() { grep -q -- "$2" "$1" 2>/dev/null; }
hasnt() { ! grep -q -- "$2" "$1" 2>/dev/null; }

# 1 ケースぶんの作業場所を作る
setup() {
  WORK="$(mktemp -d)"
  DIR="$WORK/backups"
  mkdir -p "$DIR/deploy"
  cat >"$WORK/backup.sh" <<'EOF'
#!/bin/sh
echo "KEEP=$KEEP" >>"$WORK_LOG/backup.log"
[ -z "${TEST_BACKUP_FAIL:-}" ] || exit 1
: >"$BACKUP_DIR/sysken_pay-new.sql.gz"
EOF
  cat >"$WORK/rclone" <<'EOF'
#!/bin/sh
echo "$*" >>"$WORK_LOG/rclone.log"
exit "${TEST_RCLONE_EXIT:-0}"
EOF
  cat >"$WORK/notify.sh" <<'EOF'
#!/bin/sh
echo "$*" >>"$WORK_LOG/notify.log"
EOF
  chmod +x "$WORK/backup.sh" "$WORK/rclone" "$WORK/notify.sh"
  printf 'RCLONE_DEST=secret-remote-name:\n' >"$WORK/backup.env"
  WORK_LOG="$WORK"
  export WORK_LOG
}

# run: 環境をそろえて backup-daily.sh を動かす（変数は subshell の中だけ）
run() {
  (
    export BACKUP_CMD="$WORK/backup.sh" NOTIFY_CMD="$WORK/notify.sh" \
      RCLONE_CMD="$WORK/rclone" BACKUP_DIR="$DIR"
    sh "$SCRIPT" >"$WORK/out.log" 2>&1
  )
}

old_file() { : >"$DIR/$1"; touch -t 202001010000 "$DIR/$1"; }

# 1) 設定が無い: Drive にも Slack にも触らず成功。ローカルは整理する
setup
old_file sysken_pay-old.sql.gz
( BACKUP_ENV="$WORK/none.env"; export BACKUP_ENV; run ); rc=$?
check "設定なし: 成功する" test "$rc" -eq 0
check "設定なし: rclone を呼ばない" test ! -f "$WORK/rclone.log"
check "設定なし: Slack に送らない" test ! -f "$WORK/notify.log"
check "設定なし: 古いローカルは消える" test ! -f "$DIR/sysken_pay-old.sql.gz"
check "設定なし: 新しいバックアップは残る" test -f "$DIR/sysken_pay-new.sql.gz"
check "件数での整理を無効にして呼ぶ" has "$WORK/backup.log" "KEEP=100000"

# 2) 設定あり: rclone copy の引数
setup
( BACKUP_ENV="$WORK/backup.env"; export BACKUP_ENV; run ); rc=$?
check "設定あり: 成功する" test "$rc" -eq 0
check "rclone copy を使う" has "$WORK/rclone.log" "^copy "
check "sql.gz だけを対象にする" has "$WORK/rclone.log" "--include sysken_pay-\*.sql.gz"
check "直下だけ（--max-depth 1）" has "$WORK/rclone.log" "--max-depth 1"
check "上書きしない（--ignore-existing）" has "$WORK/rclone.log" "--ignore-existing"
check "sync を使わない" hasnt "$WORK/rclone.log" "sync"
check "delete / move を使わない" hasnt "$WORK/rclone.log" "delete\|move"
check "成功時は Slack に送らない" test ! -f "$WORK/notify.log"

# 3) rclone 失敗: Slack fail、ローカルは消さない
setup
old_file sysken_pay-old.sql.gz
( BACKUP_ENV="$WORK/backup.env"; TEST_RCLONE_EXIT=1; export BACKUP_ENV TEST_RCLONE_EXIT; run ); rc=$?
check "rclone 失敗: 失敗で終わる" test "$rc" -ne 0
check "rclone 失敗: Slack に fail を送る" has "$WORK/notify.log" "^fail "
check "rclone 失敗: 古いローカルも消さない" test -f "$DIR/sysken_pay-old.sql.gz"
check "Slack の文に保存先の名前を入れない" hasnt "$WORK/notify.log" "secret-remote-name"
check "出力にも保存先の名前を出さない" hasnt "$WORK/out.log" "secret-remote-name"

# 4) バックアップ失敗: 送らない、Slack fail
setup
( BACKUP_ENV="$WORK/backup.env"; TEST_BACKUP_FAIL=1; export BACKUP_ENV TEST_BACKUP_FAIL; run ); rc=$?
check "バックアップ失敗: 失敗で終わる" test "$rc" -ne 0
check "バックアップ失敗: Drive に送らない" test ! -f "$WORK/rclone.log"
check "バックアップ失敗: Slack に fail を送る" has "$WORK/notify.log" "^fail "

# 5) rclone が入っていない（設定あり）: Slack fail
setup
( BACKUP_ENV="$WORK/backup.env"; RCLONE_CMD_OVERRIDE=1; export BACKUP_ENV
  export BACKUP_CMD="$WORK/backup.sh" NOTIFY_CMD="$WORK/notify.sh" \
    RCLONE_CMD="$WORK/no-such-rclone" BACKUP_DIR="$DIR"
  sh "$SCRIPT" >"$WORK/out.log" 2>&1 ); rc=$?
check "rclone なし: 失敗で終わる" test "$rc" -ne 0
check "rclone なし: Slack に fail を送る" has "$WORK/notify.log" "^fail "

# 6) 整理の範囲: deploy/ と名前の違うファイルには触らない。新しいものは残す
setup
old_file sysken_pay-old.sql.gz
old_file notes.txt
old_file deploy/sysken_pay-deploy-old.sql.gz
: >"$DIR/sysken_pay-recent.sql.gz"
( BACKUP_ENV="$WORK/backup.env"; export BACKUP_ENV; run ); rc=$?
check "整理: 古い sql.gz は消える" test ! -f "$DIR/sysken_pay-old.sql.gz"
check "整理: 新しい sql.gz は残る" test -f "$DIR/sysken_pay-recent.sql.gz"
check "整理: backups/deploy/ は消さない" test -f "$DIR/deploy/sysken_pay-deploy-old.sql.gz"
check "整理: 別の名前のファイルは消さない" test -f "$DIR/notes.txt"

# 7) 設定ファイルはあるが RCLONE_DEST が空: Drive には送らない
setup
printf '# 空\n' >"$WORK/backup.env"
( BACKUP_ENV="$WORK/backup.env"; export BACKUP_ENV; run ); rc=$?
check "RCLONE_DEST が空: 成功する" test "$rc" -eq 0
check "RCLONE_DEST が空: rclone を呼ばない" test ! -f "$WORK/rclone.log"

echo
echo "合格 $PASS / 失敗 $FAIL"
[ "$FAIL" -eq 0 ]
