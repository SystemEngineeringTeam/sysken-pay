#!/bin/sh
# Slack に短い連絡を送る（Incoming Webhook）。
#
#   sh deploy/raspberry-pi/notify-slack.sh <ok|warn|fail> "何が起きたか" ["次にやること"]
#
#   例: sh deploy/raspberry-pi/notify-slack.sh fail "make deploy が「ビルド」で失敗しました" "手順書の『失敗したとき』を見る"
#
# - Webhook の URL は、リポジトリの外のファイル（既定: ~/.config/sysken-pay/notify.env）の
#   SLACK_WEBHOOK_URL から読む。リポジトリには URL を書かない（公開リポジトリのため）
#   ファイルの場所は、環境変数 SYSKEN_PAY_NOTIFY_ENV で変えられる
# - URL が無い・送れないときは「連絡は送れなかった」と出すだけで、成功（終了コード 0）で終わる。
#   連絡が送れないことで、呼び出し元（make deploy など）を止めない
# - NOTIFY_DRY_RUN=1 のときは、送らずに送る文だけを表示する
# - 送る文には、日時を自動でつける。安全のため、次のものは送る前に伏せる・短くする
#   HRI（SP バーコードの番号）、IP アドレス、URL、password / token / secret の値、長い文・たくさんの行
#   （ログをまるごと送らない。呼び出し側も、要点だけを渡すこと）
set -eu

LEVEL="${1:-}"
WHAT="${2:-}"
NEXT="${3:-}"

if [ -z "$WHAT" ]; then
  echo "使い方: $0 <ok|warn|fail> \"何が起きたか\" [\"次にやること\"]" >&2
  exit 0
fi

case "$LEVEL" in
  ok) MARK="✅" ;;
  warn) MARK="⚠️" ;;
  fail) MARK="🚨" ;;
  *)
    echo "連絡の種類は ok / warn / fail のどれかにしてください: $LEVEL" >&2
    exit 0
    ;;
esac

# 送ってはいけないものを伏せる。見つけられなかったものを送らないための「最後の網」で、
# 呼び出し側でそもそも渡さないことが前提
sanitize() {
  # 1行ずつ最大10行、1行は最大200文字まで
  head -n 10 | cut -c 1-200 | sed -E \
    -e 's/SP( ?[2-9A-HJ-NP-Za-z]{4}){4}/[HRI 省略]/g' \
    -e 's/SP[0-9A-Za-z]{16}/[HRI 省略]/g' \
    -e 's#[A-Za-z][A-Za-z0-9+.-]*://[^[:space:]]+#[URL 省略]#g' \
    -e 's/[0-9]{1,3}(\.[0-9]{1,3}){3}/[IP 省略]/g' \
    -e 's/([Pp][Aa][Ss][Ss][Ww][Oo]?[Rr]?[Dd]?|[Tt][Oo][Kk][Ee][Nn]|[Ss][Ee][Cc][Rr][Ee][Tt])([=:：] *)[^[:space:]]+/\1\2[省略]/g'
}

NOW="$(date '+%Y-%m-%d %H:%M')"
TEXT="$MARK $(printf '%s\n' "$WHAT" | sanitize)"
TEXT="$TEXT
日時: $NOW"
if [ -n "$NEXT" ]; then
  TEXT="$TEXT
次にやること: $(printf '%s\n' "$NEXT" | sanitize)"
fi

if [ "${NOTIFY_DRY_RUN:-}" = "1" ]; then
  echo "[試し実行] 送る文:"
  printf '%s\n' "$TEXT"
  exit 0
fi

skip() {
  echo "連絡は送れなかった（$1）。処理は続けます。" >&2
  exit 0
}

CONF="${SYSKEN_PAY_NOTIFY_ENV:-$HOME/.config/sysken-pay/notify.env}"
[ -f "$CONF" ] || skip "連絡用の設定ファイルがありません"

# source しない（ファイルの中身を実行しないため）。SLACK_WEBHOOK_URL= の行だけ取り出す
URL="$(sed -n 's/^SLACK_WEBHOOK_URL=//p' "$CONF" | head -n 1 | tr -d "\"'\r")"
[ -n "$URL" ] || skip "SLACK_WEBHOOK_URL が空です"

# JSON の文字列にする（\ " 改行 を。タブは空白にする）
JSON_TEXT="$(printf '%s' "$TEXT" | tr '\t' ' ' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | awk 'BEGIN{ORS=""} NR>1{print "\\n"} {print}')"

umask 077
BODY="$(mktemp)"
trap 'rm -f "$BODY"' EXIT
printf '{"text":"%s"}' "$JSON_TEXT" >"$BODY"

# URL は ps に出ないよう、引数ではなく標準入力の設定で渡す
if printf 'url = "%s"\n' "$URL" |
  curl -sS --fail --max-time 10 --config - \
    -H 'Content-Type: application/json' --data "@$BODY" >/dev/null 2>&1; then
  echo "Slack に連絡しました。"
else
  skip "Slack への送信に失敗しました"
fi
