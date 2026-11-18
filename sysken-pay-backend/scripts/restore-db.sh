#!/bin/sh
# backup-db.sh で取ったバックアップを DB に戻す。今の DB の中身は上書きされる。
#
# 使い方:
#   ./scripts/restore-db.sh backups/sysken_pay-20261118-030000.sql.gz
set -eu

CONTAINER="${CONTAINER:-sysken-db}"
FILE="${1:-}"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "使い方: $0 <バックアップファイル(.sql.gz)>" >&2
  exit 1
fi

echo "今の DB の内容は $FILE の内容で上書きされます。"
echo "念のため、先に今の状態のバックアップを取ります。"
"$(dirname "$0")/backup-db.sh"

printf "戻してよければ yes と入力してください: "
read -r ANSWER
if [ "$ANSWER" != "yes" ]; then
  echo "中止しました"
  exit 1
fi

gzip -dc "$FILE" | docker exec -i "$CONTAINER" sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'
echo "戻しました: $FILE"
