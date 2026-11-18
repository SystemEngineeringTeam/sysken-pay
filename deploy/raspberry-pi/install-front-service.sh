#!/bin/sh
# フロントのサーバーを、起動時に自動で立ち上がるサービスとして登録する。
# 先に sysken-pay-front で pnpm install と pnpm build を済ませておくこと。
#
#   sh deploy/raspberry-pi/install-front-service.sh
set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
sudo cp "$HERE/sysken-pay-front.service" /etc/systemd/system/sysken-pay-front.service
sudo systemctl daemon-reload
sudo systemctl enable --now sysken-pay-front
sleep 3
systemctl is-active sysken-pay-front
