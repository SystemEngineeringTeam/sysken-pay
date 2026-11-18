#!/bin/sh
# MySQL（sysken_pay）のバックアップを backups/ に保存する。
# パスワードはコンテナ内の環境変数 MYSQL_ROOT_PASSWORD を使うので、ホスト側で入力・表示しない。
#
# 使い方:
#   ./scripts/backup-db.sh                 # backups/ に保存（最新 KEEP 件だけ残す）
#   BACKUP_DIR=/mnt/usb/sysken ./scripts/backup-db.sh   # 保存先を変える
set -eu

CONTAINER="${CONTAINER:-sysken-db}"
BACKUP_DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")/.." && pwd)/backups}"
KEEP="${KEEP:-30}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/sysken_pay-$STAMP.sql.gz"
TMP="$OUT.tmp"

docker exec "$CONTAINER" sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --databases sysken_pay' \
  | gzip > "$TMP"

# 失敗して中身が空のファイルを「成功したバックアップ」として残さない
if [ ! -s "$TMP" ] || ! gzip -dc "$TMP" | grep -q 'CREATE DATABASE'; then
  rm -f "$TMP"
  echo "バックアップに失敗しました（出力が空です）" >&2
  exit 1
fi
mv "$TMP" "$OUT"
echo "保存しました: $OUT"

# 古いバックアップを整理（新しい順に KEEP 件残す）
ls -1t "$BACKUP_DIR"/sysken_pay-*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r f; do
  rm -f "$f"
done
