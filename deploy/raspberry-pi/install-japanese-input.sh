#!/bin/sh
# ラズパイで日本語（漢字・ひらがな）を打てるようにする（fcitx5 + Mozc）。何度実行しても同じ結果になる。
#
#   sh deploy/raspberry-pi/install-japanese-input.sh
#   sh deploy/raspberry-pi/install-kiosk.sh      # キオスクの起動スクリプトも新しくする
#   sudo reboot
#
# 切り替え: Ctrl + Space（英数 ⇔ 日本語）
set -eu

sudo apt-get install -y fcitx5 fcitx5-mozc fcitx5-frontend-gtk3 fcitx5-frontend-qt5

# 入力方式の設定（英語キーボード + Mozc）。すでに自分で設定していれば上書きしない
PROFILE="$HOME/.config/fcitx5/profile"
if [ ! -f "$PROFILE" ]; then
  mkdir -p "$(dirname "$PROFILE")"
  cat > "$PROFILE" <<'PROFILE_EOF'
[Groups/0]
Name=Default
Default Layout=us
DefaultIM=mozc

[Groups/0/Items/0]
Name=keyboard-us
Layout=

[Groups/0/Items/1]
Name=mozc
Layout=

[GroupOrder]
0=Default
PROFILE_EOF
fi

# ログインしたときに fcitx5 を起動する（キオスクより前に書く）
AUTOSTART="$HOME/.config/labwc/autostart"
mkdir -p "$(dirname "$AUTOSTART")"
if [ ! -f "$AUTOSTART" ]; then
  cp /etc/xdg/labwc/autostart "$AUTOSTART"
fi
if ! grep -q "fcitx5" "$AUTOSTART"; then
  # 先頭に足す（キオスクの Chromium が起動する前に fcitx5 を動かしておく）
  { echo "fcitx5 -d &"; cat "$AUTOSTART"; } > "$AUTOSTART.tmp" && mv "$AUTOSTART.tmp" "$AUTOSTART"
fi

# X11 で動くアプリ用（Wayland で動く Chromium には text-input の仕組みで渡す）
ENVFILE="$HOME/.config/labwc/environment"
for line in "XMODIFIERS=@im=fcitx" "QT_IM_MODULE=fcitx" "GTK_IM_MODULE=fcitx"; do
  if ! grep -qxF "$line" "$ENVFILE" 2>/dev/null; then
    echo "$line" >> "$ENVFILE"
  fi
done

echo "--- $AUTOSTART ---"
cat "$AUTOSTART"
echo "--- $ENVFILE ---"
cat "$ENVFILE"
echo
echo "次に: sh deploy/raspberry-pi/install-kiosk.sh → sudo reboot"
echo "名前の入力欄で Ctrl + Space を押すと日本語に切り替わる"
