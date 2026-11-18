# シス研Pay フロントエンド

システム研究会部室で運営されているシス研商店のための、決済・購買管理Webアプリケーションです。

## 概要

- 商品購入（カート機能付き）
- 残高チャージ
- 管理者機能（商品登録・更新、ユーザー登録）

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | React 19 + TypeScript |
| ビルドツール | Vite |
| スタイリング | Tailwind CSS + SCSS |
| 状態管理 | Zustand |
| ルーティング | react-router-dom v7 + generouted（ファイルベース） |
| API通信 | openapi-fetch（OpenAPIスキーマから型生成） |
| UIコンポーネント | React Aria |
| テスト | Vitest + Testing Library + Storybook（Playwright） |

## ディレクトリ構成

```
src/
├── adapter/          # 外部との境界層（API / リポジトリ / ストレージ）
├── components/
│   ├── features/     # 機能別コンポーネント（buy / charge / home）
│   ├── layouts/      # ヘッダー等のレイアウト
│   └── ui/           # 汎用UIコンポーネント
├── hooks/            # カスタムフック
├── pages/            # ファイルベースルーティングのページ
│   ├── index.tsx     # ホーム
│   ├── buy/          # 商品購入フロー
│   ├── charge/       # 残高チャージフロー
│   └── admin/        # 管理者画面
├── services/         # ドメインロジック（カートなど）
├── store/            # Zustandストア
├── styles/           # SCSSデザイントークン
├── types/            # 型定義（api-schema.d.ts はOpenAPIから自動生成）
└── test/             # テストセットアップ
```

## セットアップ

### 必要な環境

- Node.js 18+
- pnpm

### インストール

```bash
pnpm install
```

### 開発サーバー起動

```bash
pnpm dev
```

### ビルド

```bash
pnpm build
```

### プレビュー

```bash
pnpm preview
```

Raspberry Pi等での公開用（0.0.0.0:3000）:

```bash
pnpm preview:pi
```


## 画面サイズ（Raspberry Pi 5 + 5インチ タッチモニター）

本番は 800x480（横向き）のタッチモニターで表示します。設定は `src/index.css` の冒頭にあります。

- `--screen-width` / `--screen-height`: 画面の大きさ（800px / 480px）
- `--ui-scale`: 文字や余白の倍率（0.5）。スタイルは 1600x960 基準の rem で書かれているので、0.5 倍で 800x480 に収まります
- PC で `pnpm dev` を開くと、800x480 の枠が中央に出ます。実機と同じ見え方で確認できます
- 画面を作るときは `rem` で書き、`100vh` / `100vw` は使わないでください（ページの高さは `height: 100%`）

ラズパイでは Chromium をキオスクモードで開きます（例）:

```bash
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  --window-size=800,480 --window-position=0,0 \
  http://localhost:3000
```

モニター自体の接続・ドライバ設定（`/boot/firmware/config.txt` 等）は、モニター付属の説明書に従ってください。

## APIスキーマの型生成

バックエンドのOpenAPIスキーマから型を自動生成します。バックエンドリポジトリが `../sysken-pay-backend` に存在する必要があります。

```bash
pnpm generate:api
```

生成先: `src/types/api-schema.d.ts`

## テスト

```bash
# 全テスト実行
pnpm test

# UIモードで実行
pnpm test:ui
```

## Storybook

```bash
# 起動
pnpm storybook

# ビルド
pnpm build-storybook
```

## 環境変数

`.env` ファイルをプロジェクトルートに作成してください。

```env
VITE_API_URL=http://localhost:8080   # バックエンドAPIのURL
```

管理者・チャージ画面のパスワードは、バックエンドの `.env` の `ADMIN_PASSWORD` で設定します（パスワードの確認はバックエンドで行います）。`VITE_` で始まる値はビルド後の JS から誰でも読めるので、パスワードなどの秘密情報は書かないでください。
