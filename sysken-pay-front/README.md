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
VITE_API_BASE_URL=http://localhost:8080   # バックエンドAPIのURL
VITE_ADMIN_PASSWORD=your_password         # 管理者パスワード
```
