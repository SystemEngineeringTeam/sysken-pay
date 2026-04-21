# ディレクトリ構成とアーキテクチャ

このプロジェクトは **Vite + React (SPA)** で構築されており、レイヤーアーキテクチャの考え方を採用しています。

## ディレクトリ構造

```text
src/
├── main.tsx                    # エントリーポイント
│
├── adapter/                    # 【Infra層】 外部通信の実装
│   ├── api/
│   │   └── client.ts           # openapi-fetch クライアント設定
│   └── repository/             # API呼び出しの実装
│       ├── UserRepositoryImpl.ts
│       ├── ItemRepositoryImpl.ts
│       ├── ChargeRepositoryImpl.ts
│       ├── PurchaseRepositoryImpl.ts
│       └── HistoryRepositoryImpl.ts
│
├── services/                   # 【Domain Service】 純粋なビジネスロジック
│   └── CartService.ts          # 合計金額計算・APIリクエスト形式への変換
│
├── hooks/                      # 【Connect】 UIとRepositoryを繋ぐフック
│   ├── useCart.ts              # カート操作・購入実行
│   ├── useCharge.ts            # チャージ・キャンセル
│   ├── useItem.ts              # 商品一覧取得
│   ├── useTotalPrice.ts        # カート合計金額
│   └── useBarcodeReader.ts     # バーコードスキャン → API呼び出し
│
├── store/                      # 【State】 Zustandによるグローバル状態
│   ├── useCartStore.ts         # カート内商品（CartItem[]）
│   ├── useUserStore.ts         # スキャンしたユーザー情報
│   ├── useBalanceStore.ts      # ユーザー残高
│   ├── useItemStore.ts         # 商品カタログ・管理画面選択中商品
│   └── useChargeStore.ts       # 選択中チャージ金額
│
├── pages/                      # 【UI】 ページコンポーネント（Generouted自動ルーティング）
│   ├── index.tsx               # / トップ
│   ├── 404.tsx                 # 404ページ
│   ├── buy/
│   │   ├── index.tsx           # /buy 商品バーコードスキャン
│   │   ├── list.tsx            # /buy/list カート確認
│   │   ├── confirm.tsx         # /buy/confirm 決済方法選択
│   │   ├── complete.tsx        # /buy/complete 購入完了
│   │   └── [paymentMethod]/
│   │       ├── index.tsx       # /buy/:paymentMethod 学生証スキャン or 現金投入
│   │       └── confirm.tsx     # /buy/:paymentMethod/confirm シスPay購入確定
│   ├── charge/
│   │   ├── index.tsx           # /charge パスワード認証 → 学生証スキャン
│   │   ├── select.tsx          # /charge/select チャージ金額選択
│   │   ├── insert.tsx          # /charge/insert 現金投入・API実行
│   │   └── complete.tsx        # /charge/complete チャージ完了
│   └── admin/
│       ├── index.tsx           # /admin パスワード認証
│       ├── menu.tsx            # /admin/menu メニュー
│       ├── dashboard.tsx       # /admin/dashboard
│       ├── user-register/
│       │   ├── index.tsx       # /admin/user-register 学生証スキャン
│       │   └── name.tsx        # /admin/user-register/name 氏名入力・登録
│       ├── item-register/
│       │   ├── index.tsx       # /admin/item-register JANコードスキャン
│       │   └── info.tsx        # /admin/item-register/info 商品情報入力・登録
│       └── item-update/
│           ├── index.tsx       # /admin/item-update JANコードスキャン
│           └── info.tsx        # /admin/item-update/info 商品情報編集・更新
│
├── components/                 # 【UI】 再利用可能なコンポーネント
│   ├── ui/                     # 汎用パーツ
│   │   ├── Button/             # md / lg / sm(選択状態あり)
│   │   ├── Input/              # テキスト入力（react-aria）
│   │   ├── ArrowButton/        # prev / next ナビゲーションボタン
│   │   ├── PriceLabel/         # ラベル + 金額表示
│   │   ├── PriceItemCard/      # 商品名・金額・削除ボタン
│   │   ├── CompletionModal/    # 登録・更新完了モーダル
│   │   └── BarcodeReader/      # バーコード入力UI（Enterで確定）
│   ├── layouts/
│   │   └── Header/             # ページヘッダー
│   └── features/               # 特定機能に紐づくパーツ
│       ├── home/
│       │   └── HomeButtons/    # トップページのボタン群
│       ├── buy/
│       │   ├── ItemList/       # カートアイテム一覧
│       │   ├── Total/          # 合計金額・現金完了ボタン
│       │   ├── SyskenPayConfirm/  # シスPay残高・不足額表示
│       │   └── PayMethodButton/   # 決済方法選択ボタン
│       └── charge/
│           └── SelectButton/   # チャージ金額選択ボタン群
│
├── types/
│   └── api-schema.d.ts         # OpenAPIから自動生成された型（編集禁止）
│
├── test/                       # テストファイル（集約管理）
│   ├── setup.ts                # Vitestセットアップ（jest-dom）
│   ├── repository/
│   │   ├── UserRepositoryImpl.test.ts
│   │   ├── ItemRepositoryImpl.test.ts
│   │   ├── ChargeRepositoryImpl.test.ts
│   │   └── PurchaseRepositoryImpl.test.ts
│   ├── store/
│   │   └── useCartStore.test.ts
│   ├── services/
│   │   └── CartService.test.ts
│   └── components/
│       ├── Button.test.tsx
│       ├── PriceLabel.test.tsx
│       └── CompletionModal.test.tsx
│
└── docs/
    └── ARCHITECTURE.md         # 本ファイル
```

## 型戦略

`api-schema.d.ts` の型をそのまま全レイヤーで使用しています。

```ts
// 例：APIスキーマ型を直接利用
import type { components } from "../types/api-schema";

type Item = components["schemas"]["GetItemResponse"];
type Balance = components["schemas"]["GetBalanceResponse"];
```

型の自動生成:
```bash
npm run generate:api  # openapi.yaml → api-schema.d.ts
```

## 環境変数

`.env` に以下の変数を設定してください（`.env.sample` 参照）。

| 変数名 | 説明 |
|:---|:---|
| `VITE_API_URL` | バックエンドAPIのURL（例: `http://localhost:8080`） |
| `VITE_ADMIN_PASSWORD` | 管理者・チャージ画面のパスワード |

## ルーティング (Generouted)

`src/pages` のファイル構成がそのままURLになります。

| ファイルパス | URL |
|:---|:---|
| `src/pages/index.tsx` | `/` |
| `src/pages/buy/index.tsx` | `/buy` |
| `src/pages/buy/[paymentMethod]/index.tsx` | `/buy/:paymentMethod` |
| `src/pages/charge/index.tsx` | `/charge` |
| `src/pages/admin/index.tsx` | `/admin` |

## バーコードスキャンの仕組み

`BarcodeReader` コンポーネントは非表示の `<input autoFocus>` を持ち、バーコードリーダーのキー入力を受け取ります。**Enterキー** を受信した時点でスキャン完了とみなし `onScan(barcode)` を呼び出します。

```
バーコードリーダー → キー入力 → Enterで確定 → onScan(barcode) → Repository → API
```

## テスト (Vitest)

```bash
npm test          # テスト実行
npm run test:ui   # ブラウザUIで実行
```

テストファイルはすべて `src/test/` に集約しています。

## Storybook

```bash
npm run storybook        # 開発サーバー起動 (port 6006)
npm run build-storybook  # 静的ビルド
```

UIコンポーネントのストーリーは各コンポーネントフォルダに配置しています（例: `Button.stories.tsx`）。
