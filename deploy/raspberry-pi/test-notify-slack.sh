#!/bin/sh
# notify-slack.sh のテスト。本物の Slack には送らず、偽の curl で送る中身を受け取って確かめる。
#   sh deploy/raspberry-pi/test-notify-slack.sh
set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
# 一時フォルダは再帰削除しない（安全ルール）。OS の一時領域に残るだけで害はない
WORK="$(mktemp -d)"
FAIL=0

mkdir -p "$WORK/bin"
# 偽の curl: 標準入力（設定）と、--data @ファイル の中身を保存する。CURL_FAIL=1 なら失敗する
cat >"$WORK/bin/curl" <<'C'
#!/bin/sh
cat >"$STATE/curl_config"
for a in "$@"; do
  case "$a" in
    @*) cp "${a#@}" "$STATE/curl_body" ;;
  esac
done
echo "$*" >"$STATE/curl_args"
[ "${CURL_FAIL:-}" = "1" ] && exit 22
exit 0
C
chmod +x "$WORK/bin/curl"

N=0
setup() {
  N=$((N + 1))
  STATE="$WORK/state$N"
  mkdir -p "$STATE"
  export STATE
}
# テスト用の URL。実在しない作り物（本物の URL ではない）
FAKE_URL="https://example.invalid/hooks/DUMMY"
conf() { printf 'SLACK_WEBHOOK_URL=%s\n' "$FAKE_URL" >"$STATE/notify.env"; }
run() {
  PATH="$WORK/bin:$PATH" SYSKEN_PAY_NOTIFY_ENV="$STATE/notify.env" sh "$HERE/notify-slack.sh" "$@"
}
check() { # 名前 結果（0 なら成功）
  if [ "$2" -eq 0 ]; then echo "ok: $1"; else echo "NG: $1"; FAIL=1; fi
}

# 1. 設定ファイルが無くても、エラーにせず「送れなかった」と出して終わる
setup
r=0; out="$(run ok "テスト" 2>&1)" || r=1; check "設定なしでも終了コード 0" $r
r=0; echo "$out" | grep -q "連絡は送れなかった" || r=1; check "設定なしは「送れなかった」と出す" $r
r=0; [ ! -f "$STATE/curl_body" ] || r=1; check "設定なしは curl を呼ばない" $r

# 2. URL が空でも同じ
setup
echo "SLACK_WEBHOOK_URL=" >"$STATE/notify.env"
r=0; out="$(run ok "テスト" 2>&1)" || r=1; check "URL が空でも終了コード 0" $r
r=0; echo "$out" | grep -q "連絡は送れなかった" || r=1; check "URL が空は「送れなかった」と出す" $r

# 3. 送れるとき: 日本語・日時・次にやること・種類の印が入る。URL は引数に出ない
setup; conf
r=0; run fail "更新が「ビルド」で失敗しました" "手順書の『失敗したとき』を見る" >/dev/null 2>&1 || r=1; check "送信できる" $r
r=0; grep -q '"text"' "$STATE/curl_body" || r=1; check "本文は JSON" $r
r=0; grep -q "🚨" "$STATE/curl_body" || r=1; check "fail の印" $r
r=0; grep -q "日時:" "$STATE/curl_body" || r=1; check "日時が入る" $r
r=0; grep -q "次にやること" "$STATE/curl_body" || r=1; check "次にやることが入る" $r
r=0; grep -q "$FAKE_URL" "$STATE/curl_config" || r=1; check "URL は標準入力の設定で渡す" $r
r=0; ! grep -q "$FAKE_URL" "$STATE/curl_args" || r=1; check "URL を引数（ps に見える所）に出さない" $r

# 4. 送ってはいけないものは伏せる
setup; conf
run warn "HRI SP7Q2KX9MDRA4TW8YZ と SP 7Q2K X9MD RA4T W8YZ、IP 192.168.1.23、https://example.com/x?a=1、password=hunter2 token: abc123" >/dev/null 2>&1
for bad in SP7Q2KX9MDRA4TW8YZ "7Q2K X9MD" 192.168.1.23 "example.com" hunter2 abc123; do
  r=0; ! grep -q "$bad" "$STATE/curl_body" || r=1; check "伏せる: $bad" $r
done

# 5. ログをまるごと送らない（行数・長さを制限）
setup; conf
long="$(awk 'BEGIN{for(i=1;i<=50;i++) print "行" i}')"
run fail "$long" >/dev/null 2>&1
r=0; ! grep -q "行11" "$STATE/curl_body" || r=1; check "11行目以降は送らない" $r

# 6. 引用符・改行があっても JSON が壊れない（本文が 1 行で、改行は \n）
setup; conf
run ok '引用 "あ" と バックスラッシュ \ と
改行' >/dev/null 2>&1
r=0; [ "$(wc -l <"$STATE/curl_body" | tr -d ' ')" = "0" ] || r=1; check "JSON は 1 行" $r
r=0; grep -q '\\"あ\\"' "$STATE/curl_body" || r=1; check "引用符をエスケープ" $r

# 7. 送信に失敗しても終了コード 0
setup; conf
r=0; CURL_FAIL=1 run ok "テスト" >/dev/null 2>&1 || r=1; check "curl が失敗しても終了コード 0" $r

# 8. 試し実行は送らない
setup; conf
r=0; out="$(NOTIFY_DRY_RUN=1 run ok "テスト")" || r=1
[ ! -f "$STATE/curl_body" ] || r=1; check "NOTIFY_DRY_RUN=1 は送らない" $r
r=0; echo "$out" | grep -q "テスト" || r=1; check "試し実行は文を表示する" $r

# 9. 種類・引数がおかしくても止まらない
setup; conf
r=0; run bad "テスト" >/dev/null 2>&1 || r=1; check "種類が違っても終了コード 0" $r
r=0; run ok >/dev/null 2>&1 || r=1; check "文が空でも終了コード 0" $r

if [ "$FAIL" -eq 0 ]; then echo "すべて成功"; else echo "失敗あり"; exit 1; fi
