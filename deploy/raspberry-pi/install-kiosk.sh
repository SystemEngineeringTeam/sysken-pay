#!/bin/sh
# キオスク表示（Chromium の全画面）を、ログイン時に自動で起動するように設定する。
# 何度実行しても同じ結果になる。
#
#   sh deploy/raspberry-pi/install-kiosk.sh
set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
KIOSK="$HOME/sysken-pay-kiosk.sh"
AUTOSTART="$HOME/.config/labwc/autostart"

cp "$HERE/sysken-pay-kiosk.sh" "$KIOSK"
chmod +x "$KIOSK"

mkdir -p "$(dirname "$AUTOSTART")"
# 自分用の autostart があると標準のもの（デスクトップ・上のバーなど）が使われなくなるので、標準の内容をコピーしてから足す
if [ ! -f "$AUTOSTART" ]; then
  cp /etc/xdg/labwc/autostart "$AUTOSTART"
fi
if ! grep -qF "$KIOSK" "$AUTOSTART"; then
  echo "$KIOSK &" >> "$AUTOSTART"
fi

echo "キオスクの起動スクリプト: $KIOSK"
echo "--- $AUTOSTART ---"
cat "$AUTOSTART"
