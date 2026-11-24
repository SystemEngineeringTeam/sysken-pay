# ディレクトリ構成とアーキテクチャ

このプロジェクトは **Vite + React (SPA)** で構築されており、レイヤーアーキテクチャの考え方を採用しています。

## ディレクトリ構造

```text
src/
├── main.tsx                    # エントリーポイント
│
├── adapter/                    # 【Infra層】 外部通信の実装
│   ├── api/
│   │   ├── client.ts           # openapi-fetch クライアント設定（認証済みのときだけ Authorization を付ける）
│   │   ├── adminCredentials.ts # 管理者パスワードか、管理者バーコードで解除した Session をメモリにだけ持つ
│   │   └── ApiError.ts         # API のエラー（ステータスと内容）
│   └── repository/             # API呼び出しの実装
│       ├── AuthRepositoryImpl.ts     # パスワードの確認・管理者バーコードでの解除
│       ├── UserRepositoryImpl.ts
│       ├── ItemRepositoryImpl.ts
│       ├── ChargeRepositoryImpl.ts
│       ├── PurchaseRepositoryImpl.ts
│       ├── HistoryRepositoryImpl.ts
│       └── HriRepositoryImpl.ts      # 支払い用バーコード（HRI）の発行と照合
│
├── services/                   # 【Domain Service】 純粋なビジネスロジック
│   ├── CartService.ts          # 合計金額計算・APIリクエスト形式への変換
│   ├── chargeAmounts.ts        # チャージできる金額
│   ├── paymentScan.ts          # 読み取った文字が学生証の学籍番号か
│   ├── barcodeText.ts          # 全角で入った英数字を半角にする
│   ├── qrUrl.ts                # スマホ登録の QR の URL と表示時間
│   ├── phoneRegisterState.ts   # スマホ登録の画面に渡す情報
│   ├── formatYen.ts            # 金額を「¥1,230」の形で表示する
│   └── *ErrorMessage.ts        # API のエラーを画面に出す日本語にする（購入・商品・ユーザー・スマホ登録・管理者バーコード）
│
├── hooks/                      # 【Connect】 UIとRepositoryを繋ぐフック
│   ├── useCart.ts              # カート操作・購入実行
│   ├── useCharge.ts            # チャージ
│   ├── useTotalPrice.ts        # カート合計金額
│   ├── useAdminLogin.ts        # 管理者・チャージの画面のパスワードか管理者バーコードの確認
│   ├── usePhoneRegister.ts     # スマホ登録（学生証を読む → QR を出す → 時間が来たら消す）
│   └── useBarcodeReader.tsx    # バーコードスキャン → API呼び出し（useProductScan / usePaymentCardScan / useCartScan）
│
├── store/                      # 【State】 Zustandによるグローバル状態
│   ├── useCartStore.ts         # カート内商品（CartItem[]）
│   ├── useUserStore.ts         # スキャンしたユーザー情報
│   ├── useBalanceStore.ts      # ユーザー残高
│   └── useChargeStore.ts       # 選択中チャージ金額
│
├── pages/                      # 【UI】 ページコンポーネント（Generouted自動ルーティング）
│   ├── index.tsx               # / トップ
│   ├── 404.tsx                 # 404ページ
│   ├── balance.tsx             # /balance 残高の表示
│   ├── buy/
│   │   ├── index.tsx           # /buy 商品バーコードスキャン
│   │   ├── list.tsx            # /buy/list カート確認
│   │   ├── complete.tsx        # /buy/complete 購入完了
│   │   └── [paymentMethod]/
│   │       └── index.tsx       # /buy/:paymentMethod シス研Payバーコードのスキャン
│   ├── charge/
│   │   ├── index.tsx           # /charge パスワードか管理者バーコードの確認 → シス研Payバーコードのスキャン
│   │   ├── select.tsx          # /charge/select チャージ金額選択
│   │   ├── insert.tsx          # /charge/insert 現金投入・API実行
│   │   └── complete.tsx        # /charge/complete チャージ完了
│   └── admin/
│       ├── index.tsx           # /admin パスワードか管理者バーコードの確認
│       ├── menu.tsx            # /admin/menu メニュー（ユーザー登録・バーコード再発行）
│       ├── user-register/
│       │   └── index.tsx       # /admin/user-register 学生証スキャン・登録
│       └── phone-register/
│           └── index.tsx       # /admin/phone-register スマホ用バーコードの再発行（QR を2分だけ出す）
│
├── components/                 # 【UI】 再利用可能なコンポーネント
│   ├── ui/                     # 汎用パーツ
│   │   ├── Button/             # md / lg / sm(選択状態あり)
│   │   ├── Input/              # テキスト入力（react-aria）
│   │   ├── ArrowButton/        # prev / next ナビゲーションボタン
│   │   ├── PriceLabel/         # ラベル + 金額表示
│   │   ├── PriceItemCard/      # 商品名・金額・削除ボタン
│   │   ├── CompletionModal/    # 登録・更新完了モーダル
│   │   ├── ConfirmDialog/      # 確認ダイアログ
│   │   ├── BarcodeReader/      # バーコード入力UI（Enterで確定）
│   │   ├── HiddenBarcodeInput/ # 画面に出さないバーコード入力
│   │   └── QrCode/             # QR の表示
│   ├── layouts/
│   │   └── Header/             # ページヘッダー
│   └── features/               # 特定機能に紐づくパーツ
│       ├── home/
│       │   └── ChargeButton/   # トップページのチャージボタン
│       ├── buy/
│       │   ├── ItemList/       # カートアイテム一覧
│       │   └── Total/          # 合計金額
│       └── charge/
│           └── SelectButton/   # チャージ金額選択ボタン群
│
├── types/
│   └── api-schema.d.ts         # OpenAPIから自動生成された型（編集禁止）
│
├── test/                       # テストファイル（集約管理）
│   ├── setup.ts                # Vitestセットアップ（jest-dom）
│   ├── api/                    # adminCredentials
│   ├── repository/             # 各 RepositoryImpl
│   ├── services/               # CartService・chargeAmounts・各 ErrorMessage など
│   ├── hooks/                  # useAdminLogin・usePhoneRegister・各スキャンのフック
│   ├── store/                  # useCartStore
│   └── components/             # Button・PriceLabel・CompletionModal・ConfirmDialog・Header
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
pnpm generate:api  # openapi.yaml → api-schema.d.ts
```

## 環境変数

`.env` に以下の変数を設定してください（`.env.sample` 参照）。

| 変数名 | 説明 |
|:---|:---|
| `VITE_API_URL` | バックエンドAPIのURL（例: `http://localhost:8080`） |

管理者・チャージ画面のパスワードはフロントには持たず、バックエンドの `ADMIN_PASSWORD`（チャージの画面では `CHARGE_PASSWORD` も可）で確認する（BASIC 認証）。管理者のシス研Payバーコードを読んだときは `POST /v1/admin/unlock` で解除し、返ってきたトークンを `Authorization: Session <token>` で送る。確認できたパスワードとトークンは `adapter/api/adminCredentials.ts` がメモリにだけ保持し、`apiClient` が `Authorization` ヘッダーを付ける。ホーム画面に戻ると破棄される。

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
pnpm exec vitest run src/test  # 単体テストを実行（`pnpm test` は Storybook のブラウザテストも含む）
pnpm test:ui                   # ブラウザUIで実行
```

テストファイルはすべて `src/test/` に集約しています。

## Storybook

```bash
pnpm storybook        # 開発サーバー起動 (port 6006)
pnpm build-storybook  # 静的ビルド
```

UIコンポーネントのストーリーは各コンポーネントフォルダに配置しています（例: `Button.stories.tsx`）。
