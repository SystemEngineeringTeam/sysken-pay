#!/bin/sh
# DB の変更（migration）を、番号の順に「まだのものだけ」当てる。
# 当てたファイル名は DB の schema_migrations 表に記録する。
#
# 使い方（Makefile から呼ぶ）:
#   ./scripts/migrate.sh status          # 当てたもの・まだのものを出す（DB は変えない）
#   ./scripts/migrate.sh up              # まだのものを番号の順に当てる（先にバックアップ）
#   SKIP_BACKUP=1 ./scripts/migrate.sh up   # バックアップを取らずに当てる（make deploy が先に取ったときだけ使う）
#   ./scripts/migrate.sh baseline 004    # 001〜004 を「当てたことにする」印だけつける（SQL は流さない）
#
# 注意: MySQL の CREATE / ALTER / DROP はトランザクションで戻せない。
#   途中で失敗したファイルは、途中まで DB に反映されている可能性がある。
#   失敗したらそこで止まり、次のファイルは当てない。表には印をつけない。
set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
CONTAINER="${CONTAINER:-sysken-db}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$HERE/../db/migrations}"
BACKUP_CMD="${BACKUP_CMD:-$HERE/backup-db.sh}"
TABLE=schema_migrations

# 標準入力の SQL を DB で実行する（パスワードはコンテナ内の環境変数を使う）
run_sql() {
  docker exec -i "$CONTAINER" sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot --batch --skip-column-names sysken_pay'
}

query() {
  printf '%s\n' "$1" | run_sql
}

has_table() {
  n="$(query "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'sysken_pay' AND TABLE_NAME = '$TABLE'")"
  [ "$n" = "1" ]
}

create_table() {
  query "CREATE TABLE IF NOT EXISTS $TABLE (
    filename VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (filename)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" >/dev/null
}

# migration のファイル名を番号の順に出す
list_files() {
  for f in "$MIGRATIONS_DIR"/[0-9][0-9][0-9]_*.sql; do
    [ -f "$f" ] && basename "$f"
  done
  return 0
}

record() {
  # ファイル名は list_files の出力（英数字と _ . だけ）なので、そのまま SQL に入れてよい
  query "INSERT INTO $TABLE (filename) VALUES ('$1')" >/dev/null
}

APPLIED_FILE="$(mktemp)"
trap 'rm -f "$APPLIED_FILE"' EXIT

load_applied() {
  query "SELECT filename FROM $TABLE ORDER BY filename" >"$APPLIED_FILE"
}

is_applied() {
  grep -Fxq "$1" "$APPLIED_FILE"
}

need_baseline_message() {
  cat >&2 <<'M'
migration の一覧の表（schema_migrations）がまだありません。
最初の1回だけ、今の DB がどこまで当たっているかを人が確かめて、印をつけます。
  1. DB に表・列があるかで、どこまで当たっているか確かめる（docs/raspberry-pi-setup.md の「migration の最初の1回だけ」）
  2. make migrate-baseline UPTO=<当たっている最後の番号>   例: make migrate-baseline UPTO=004
M
}

cmd_status() {
  echo "migration の状態（DB は変えません）"
  if ! has_table; then
    : >"$APPLIED_FILE"
    echo "  ※ 一覧の表（${TABLE}）がまだありません。すべて「まだ」と表示します。"
    echo "  ※ 最初の1回だけ make migrate-baseline UPTO=<番号> が必要です。"
  else
    load_applied
  fi
  pending=0
  for f in $(list_files); do
    if is_applied "$f"; then
      echo "  [当てた] $f"
    else
      echo "  [まだ  ] $f"
      pending=$((pending + 1))
    fi
  done
  echo "まだのもの: $pending 件"
}

cmd_up() {
  if ! has_table; then
    need_baseline_message
    echo "表がないまま当てると 001 から流し直してしまうので、止めました。" >&2
    exit 1
  fi
  load_applied
  pending=""
  for f in $(list_files); do
    is_applied "$f" || pending="$pending $f"
  done
  if [ -z "$pending" ]; then
    echo "まだ当てていない migration はありません。"
    return 0
  fi
  echo "これから当てる migration（番号の順）:"
  for f in $pending; do echo "  - $f"; done

  if [ "${SKIP_BACKUP:-}" = "1" ]; then
    # make deploy が直前に取っている。単独で使うときは付けない（付けないと必ず取る）
    echo "バックアップは呼び出し元（make deploy）が取ったので、ここでは取りません。"
  else
    echo "当てる前にバックアップを取ります。"
    if ! "$BACKUP_CMD"; then
      echo "バックアップに失敗したので、migration は当てていません。" >&2
      exit 1
    fi
  fi

  for f in $pending; do
    echo "当てています: $f"
    if run_sql <"$MIGRATIONS_DIR/$f"; then
      record "$f"
      echo "  → 済み"
    else
      cat >&2 <<M
失敗しました: $f
  - ここで止めました。次のファイルは当てていません。表には印をつけていません。
  - MySQL の CREATE / ALTER / DROP は戻せないので、このファイルは途中まで DB に反映されている可能性があります。
  - 直前のバックアップは backups/ にあります。勝手に直さず、この変更を作った人に連絡してください。
M
      exit 1
    fi
  done
  echo "すべて当てました。"
}

cmd_baseline() {
  upto="${1:-}"
  case "$upto" in
    [0-9][0-9][0-9]) ;;
    *)
      echo "使い方: make migrate-baseline UPTO=004（3桁の番号）" >&2
      exit 1
      ;;
  esac

  if has_table; then
    load_applied
    if [ -s "$APPLIED_FILE" ]; then
      echo "表（${TABLE}）にはもう印があります。何もせず止まります。" >&2
      echo "今の状態は make migrate-status で見られます。" >&2
      exit 1
    fi
  fi

  targets=""
  found_upto=0
  for f in $(list_files); do
    num="${f%%_*}"
    if [ "$num" -le "$upto" ]; then
      targets="$targets $f"
    fi
    [ "$num" = "$upto" ] && found_upto=1
  done
  if [ "$found_upto" != "1" ]; then
    echo "番号 $upto の migration ファイルがありません。" >&2
    exit 1
  fi

  echo "次のファイルを「当てたことにする」印だけつけます（SQL は流しません）:"
  for f in $targets; do echo "  - $f"; done
  echo "ここにないものは、これから make migrate-up で当たります。"
  echo "※ DB にまだ無い変更を「当てた」ことにすると、API が壊れます。DB を確かめてから答えてください。"
  if [ "${ASSUME_YES:-}" != "1" ]; then
    printf "よければ yes と入力してください: "
    read -r answer
    if [ "$answer" != "yes" ]; then
      echo "中止しました"
      exit 1
    fi
  fi

  echo "先にバックアップを取ります。"
  "$BACKUP_CMD"
  create_table
  for f in $targets; do record "$f"; done
  echo "印をつけました。make migrate-status で確かめてください。"
}

case "${1:-}" in
  status) cmd_status ;;
  up) cmd_up ;;
  baseline) shift; cmd_baseline "${1:-}" ;;
  *)
    echo "使い方: $0 status | up | baseline <番号>" >&2
    exit 1
    ;;
esac
