#!/bin/sh
# 毎日のバックアップ（cron から呼ぶ）。DB を backups/ に保存し、Google Drive に送り、古いものを整理する。
#   sh deploy/raspberry-pi/backup-daily.sh
#
# - 送るのは backups/ 直下の sysken_pay-*.sql.gz だけ（暗号化はしない）。backups/deploy/ は送らない・消さない
# - Drive 側は消さない（rclone copy は、送るだけで消さない。すでにあるファイルは上書きもしない）
# - ラズパイの中は、14 日より古い sysken_pay-*.sql.gz を消す（Drive に送れたとき、または Drive 未設定のときだけ）
# - Drive の設定（~/.config/sysken-pay/backup.env）が無ければ、Drive には送らない（ローカルのバックアップだけ）
# - 失敗したら Slack に知らせる（短い文だけ。保存先の名前・パスワードは送らない）
#
# 環境変数（ふだんは触らない。テスト用）:
#   BACKUP_CMD / NOTIFY_CMD / RCLONE_CMD / BACKUP_DIR / BACKUP_ENV / KEEP_DAYS
set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
BACK="$ROOT/sysken-pay-backend"

BACKUP_CMD="${BACKUP_CMD:-$BACK/scripts/backup-db.sh}"
NOTIFY_CMD="${NOTIFY_CMD:-$HERE/notify-slack.sh}"
RCLONE_CMD="${RCLONE_CMD:-rclone}"
BACKUP_DIR="${BACKUP_DIR:-$BACK/backups}"
BACKUP_ENV="${BACKUP_ENV:-$HOME/.config/sysken-pay/backup.env}"
KEEP_DAYS="${KEEP_DAYS:-14}"

notify() { "$NOTIFY_CMD" "$@" || true; }

# 1) ローカルに保存する。件数での整理は、ここでは無効にする（日数で整理するため）
export BACKUP_DIR
if ! KEEP=100000 "$BACKUP_CMD"; then
  echo "バックアップに失敗しました" >&2
  notify fail "毎日のバックアップが失敗しました（DB のバックアップを取れていません）" \
    "手順書の「7. DB のバックアップを毎日取る」と backups/backup.log を見る"
  exit 1
fi

# 2) Drive に送る（設定があるときだけ）
UPLOADED=ok
RCLONE_DEST=""
if [ -f "$BACKUP_ENV" ]; then
  # shellcheck disable=SC1090
  RCLONE_DEST="$(. "$BACKUP_ENV" >/dev/null 2>&1; printf '%s' "${RCLONE_DEST:-}")"
fi
if [ -z "$RCLONE_DEST" ]; then
  echo "Google Drive の設定が無いので、Drive には送りません（ラズパイの中のバックアップだけ）"
else
  # 送るのは直下の sysken_pay-*.sql.gz だけ。送れていない日があっても、次の日にまとめて送る
  if "$RCLONE_CMD" copy "$BACKUP_DIR" "$RCLONE_DEST" \
    --max-depth 1 --include 'sysken_pay-*.sql.gz' --ignore-existing; then
    echo "Google Drive に送りました"
  else
    UPLOADED=ng
    echo "Google Drive に送れませんでした" >&2
    notify fail "毎日のバックアップを Google Drive に送れませんでした（ラズパイの中には保存済み）" \
      "手順書の「13. Google Drive にバックアップを送る」の「送れないとき」を見る"
  fi
fi

# 3) ラズパイの中を整理する（送れなかったときは消さない。直下の sysken_pay-*.sql.gz だけが対象）
if [ "$UPLOADED" = "ok" ]; then
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'sysken_pay-*.sql.gz' -mtime "+$KEEP_DAYS" -exec rm -f {} +
fi

[ "$UPLOADED" = "ok" ] || exit 1
exit 0
