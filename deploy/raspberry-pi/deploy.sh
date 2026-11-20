#!/bin/sh
# ラズパイを最新の main に更新する（make deploy の中身）。
#   cd sysken-pay-backend && make deploy
#   DRY_RUN=1 make deploy     # 何をするかだけ表示する（pull も再起動もしない）
#
# 流れ: 1) 全部ビルド → 2) バックアップ → 3) migration → 4) バックを入れ替えて health 確認
#       → 5) フロントを入れ替えて再起動 → Chromium を開き直す
# 失敗したらそこで止まり、Slack に知らせる。自動では元に戻さない（手順書の「失敗したとき」を見る）。
#
# 環境変数（ふだんは触らない。テスト用）:
#   NOTIFY_CMD / BACKUP_CMD / MIGRATE_CMD / SYSTEMCTL_CMD / LOCK_FILE / HEALTH_URL / FRONT_URL
#   HEALTH_TRIES（15）/ HEALTH_INTERVAL（2 秒）/ KIOSK_FLAG（~/.kiosk-disabled）
set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
BACK="$ROOT/sysken-pay-backend"
FRONT="$ROOT/sysken-pay-front"

NOTIFY_CMD="${NOTIFY_CMD:-$HERE/notify-slack.sh}"
BACKUP_CMD="${BACKUP_CMD:-$BACK/scripts/backup-db.sh}"
MIGRATE_CMD="${MIGRATE_CMD:-$BACK/scripts/migrate.sh}"
SYSTEMCTL_CMD="${SYSTEMCTL_CMD:-sudo systemctl}"
LOCK_FILE="${LOCK_FILE:-${XDG_CACHE_HOME:-$HOME/.cache}/sysken-pay/deploy.lock}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/v1/health}"
FRONT_URL="${FRONT_URL:-http://127.0.0.1:3000}"
HEALTH_TRIES="${HEALTH_TRIES:-15}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"
KIOSK_FLAG="${KIOSK_FLAG:-$HOME/.kiosk-disabled}"
DRY_RUN="${DRY_RUN:-}"

STEP="準備"
FINISHED=0

notify() { "$NOTIFY_CMD" "$@" || true; }

# 失敗で終わったときだけ Slack に知らせる（正常終了・「更新中です」・DRY_RUN では知らせない）
on_exit() {
  rc=$?
  if [ "$rc" -ne 0 ] && [ "$FINISHED" -eq 0 ]; then
    notify fail "make deploy が「${STEP}」で失敗しました" \
      "ラズパイの手順書の「失敗したとき」を見る（自動では元に戻していません）"
  fi
}

# 指定の URL が 200 を返すまで待つ。回数・間隔は HEALTH_TRIES / HEALTH_INTERVAL
wait_ok() { # 名前 URL
  i=1
  while [ "$i" -le "$HEALTH_TRIES" ]; do
    if curl -fsS -o /dev/null --max-time 3 "$2" 2>/dev/null; then
      echo "$1: OK（${i} 回目）"
      return 0
    fi
    sleep "$HEALTH_INTERVAL"
    i=$((i + 1))
  done
  echo "$1: ${HEALTH_TRIES} 回確かめても OK になりませんでした" >&2
  return 1
}

# 変更されたファイルを種類に分ける
classify() {
  F_FRONT=0 F_LOCK=0 F_BACK=0 F_MIG=0 F_PI=0 F_OTHER=0 F_DOC=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    case "$f" in
      deploy/raspberry-pi/*) F_PI=1 ;;
      sysken-pay-front/pnpm-lock.yaml) F_FRONT=1 F_LOCK=1 ;;
      sysken-pay-front/*.md | sysken-pay-front/.claude/* | sysken-pay-front/.github/*) F_OTHER=1 ;;
      sysken-pay-front/*) F_FRONT=1 ;;
      sysken-pay-backend/db/migrations/*) F_MIG=1 ;;
      sysken-pay-backend/*.md | sysken-pay-backend/docs/* | sysken-pay-backend/scripts/* | \
        sysken-pay-backend/Makefile | sysken-pay-backend/.claude/* | sysken-pay-backend/.github/*) F_OTHER=1 ;;
      sysken-pay-backend/*) F_BACK=1 ;;
      docs/*) F_DOC=1 ;;
      *) F_OTHER=1 ;; # sysken-pay-qr/・README など。ラズパイでは何もしない
    esac
  done
}

main() {
  trap on_exit EXIT

  # 二重に動かさない。flock はスクリプトが終わる・落ちると自動で外れる
  mkdir -p "$(dirname "$LOCK_FILE")"
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "更新中です（別の make deploy が動いています）"
    FINISHED=1
    exit 1
  fi

  cd "$ROOT"
  STEP="最新のコミットの取得（git fetch）"
  git fetch
  OLD="$(git rev-parse --short HEAD)"
  NEW="$(git rev-parse --short '@{u}')"
  if [ "$(git rev-parse HEAD)" = "$(git rev-parse '@{u}')" ]; then
    echo "更新はありません"
    FINISHED=1
    exit 0
  fi

  classify <<EOF
$(git diff --name-only 'HEAD..@{u}')
EOF

  # 何をするか決める
  DO_BACK=0
  { [ "$F_BACK" -eq 1 ] || [ "$F_MIG" -eq 1 ]; } && DO_BACK=1
  DO_FRONT="$F_FRONT"

  if [ -n "$DRY_RUN" ]; then
    echo "DRY_RUN: $OLD → ${NEW}（pull も再起動もしません）"
    echo "  変更の種類: フロント=${F_FRONT}（lock=${F_LOCK}） バック=$F_BACK migration=$F_MIG deploy/raspberry-pi=$F_PI その他=$F_OTHER docs=$F_DOC"
    echo "  1) git pull --ff-only"
    [ "$DO_FRONT" -eq 1 ] && echo "  2) フロントを dist-new にビルド"
    [ "$F_BACK" -eq 1 ] && echo "  2) docker compose build"
    [ "$DO_BACK" -eq 1 ] && echo "  3) バックアップ（backups/deploy・新しい 10 件）→ migration → docker compose up -d → health 確認"
    [ "$DO_FRONT" -eq 1 ] && echo "  4) dist を入れ替え → sysken-pay-front を再起動 → Chromium を開き直す"
    [ "$F_PI" -eq 1 ] && echo "  ⚠️ deploy/raspberry-pi が変わっています（手順書を見て入れ直しが必要）"
    if [ "$DO_BACK" -eq 0 ] && [ "$DO_FRONT" -eq 0 ]; then echo "  再起動はしません"; fi
    FINISHED=1
    exit 0
  fi

  STEP="git pull"
  git pull --ff-only

  if [ "$DO_BACK" -eq 0 ] && [ "$DO_FRONT" -eq 0 ]; then
    if [ "$F_DOC" -eq 1 ] && [ "$F_OTHER" -eq 0 ] && [ "$F_PI" -eq 0 ]; then
      echo "ドキュメントだけの更新です（再起動なし）"
    else
      echo "ラズパイで入れ替えるものはありません（再起動なし）"
    fi
    if [ "$F_PI" -eq 1 ]; then
      pi_warn
    fi
    FINISHED=1
    exit 0
  fi

  # 1) 全部ビルドする（ここで失敗しても、動いているものには触らない）
  if [ "$DO_FRONT" -eq 1 ]; then
    STEP="フロントのビルド"
    if [ "$F_LOCK" -eq 1 ] || [ ! -d "$FRONT/node_modules" ]; then
      (cd "$FRONT" && pnpm install --frozen-lockfile)
    fi
    (cd "$FRONT" && pnpm build --outDir dist-new)
    [ -d "$FRONT/dist-new" ] || { echo "dist-new ができていません" >&2; exit 1; }
  fi
  if [ "$F_BACK" -eq 1 ]; then
    STEP="バックエンドのビルド（docker compose build）"
    (cd "$BACK" && docker compose build)
  fi

  if [ "$DO_BACK" -eq 1 ]; then
    # 2) バックアップ（毎日のバックアップとは別のフォルダ。新しい 10 件だけ残す）
    STEP="バックアップ"
    BACKUP_DIR="$BACK/backups/deploy" KEEP=10 "$BACKUP_CMD"

    # 3) migration（バックアップは上で取ったので、二重に取らない）
    STEP="migration"
    SKIP_BACKUP=1 "$MIGRATE_CMD" up

    # 4) バックを入れ替えて、DB までつながっているか確かめる
    STEP="バックエンドの入れ替え（docker compose up -d）"
    (cd "$BACK" && docker compose up -d)
    STEP="バックエンドの health 確認（${HEALTH_URL}）"
    wait_ok "バックエンド" "$HEALTH_URL"
  fi

  if [ "$DO_FRONT" -eq 1 ]; then
    # 5) フロントを入れ替える（消さずに名前を替えるだけ。dist-tmp が残っていたら止まる）
    STEP="フロントの入れ替え"
    if [ -e "$FRONT/dist-tmp" ]; then
      echo "dist-tmp が残っています。前の失敗の跡です。中を確かめて、手で片づけてください" >&2
      exit 1
    fi
    if [ -d "$FRONT/dist" ]; then
      mv "$FRONT/dist" "$FRONT/dist-tmp"
      mv "$FRONT/dist-new" "$FRONT/dist"
      mv "$FRONT/dist-tmp" "$FRONT/dist-new"
    else
      mv "$FRONT/dist-new" "$FRONT/dist"
    fi
    STEP="フロントの再起動（sysken-pay-front）"
    # shellcheck disable=SC2086
    $SYSTEMCTL_CMD restart sysken-pay-front
    STEP="フロントの確認（${FRONT_URL}）"
    wait_ok "フロント" "$FRONT_URL"

    STEP="Chromium の開き直し"
    if [ -e "$KIOSK_FLAG" ]; then
      echo "キオスクは止めてあるので（${KIOSK_FLAG}）、Chromium は再起動しません"
    else
      pkill -f chromium || true
    fi
  fi

  STEP="完了の連絡"
  echo "更新しました（$OLD → ${NEW}）"
  notify ok "更新しました（$OLD → ${NEW}）"
  if [ "$F_PI" -eq 1 ]; then
    pi_warn
  fi
  FINISHED=1
  exit 0
}

pi_warn() {
  echo "⚠️ deploy/raspberry-pi が変わりました。手順書を見て入れ直してください"
  notify warn "deploy/raspberry-pi が変わりました。手順書を見て入れ直してください" \
    "docs/raspberry-pi-setup.md を見て、変わった設定を入れ直す"
}

# main の中で git pull が deploy.sh 自身を書き換えても、動いている途中のシェルが壊れないように、
# 全部読み込んでから実行し、必ず exit で終わる
main "$@"
exit 0
