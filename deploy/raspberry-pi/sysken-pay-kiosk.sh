#!/bin/sh
# シス研Pay のキオスク表示。labwc の autostart から起動される（install-kiosk.sh が設定する）
#
# 保守で全画面を止めたいとき:  touch ~/.kiosk-disabled && pkill -f chromium
# 元に戻すとき:                rm ~/.kiosk-disabled してから再起動

URL="http://127.0.0.1:3000/"

# フロントのサーバー（sysken-pay-front.service）が立ち上がるまで待つ（最大2分）
i=0
while [ "$i" -lt 60 ]; do
  curl -s -o /dev/null "$URL" && break
  i=$((i + 1))
  sleep 2
done

# 閉じてしまっても自動で開き直す
while [ ! -f "$HOME/.kiosk-disabled" ]; do
  # --password-store=basic: 鍵束（キーリング）のパスワード画面を出さない（出ると読み込みが止まる）
  chromium \
    --kiosk \
    --password-store=basic \
    --noerrdialogs \
    --disable-infobars \
    --no-first-run \
    --hide-crash-restore-bubble \
    --disable-features=Translate \
    --check-for-update-interval=31536000 \
    "$URL"
  sleep 2
done
