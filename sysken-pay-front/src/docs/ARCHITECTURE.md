# ディレクトリ構成とアーキテクチャ

このプロジェクトは **Vite + React (SPA)** で構築されており、クリーンアーキテクチャ（レイヤーアーキテクチャ）の考え方を採用しています。
機能ごとではなく「役割（レイヤー）」ごとにトップレベルのディレクトリを分割しています。

## ディレクトリ構造

```text
src/
├── main.tsx                # エントリーポイント
├── App.tsx                 # 全体のプロバイダー設定
├── routes.tsx              # ルーティング定義
│
├── adapter/                # 【Infra層】 外部通信・実装詳細
│   ├── api/
│   │   └── client.ts       # Axiosインスタンス設定
│   └── repository/         # APIを叩く実装
│       ├── ItemRepositoryImpl.ts
│       ├── UserRepositoryImpl.ts
│       ├── PurchaseRepositoryImpl.ts
│       ├── ChargeRepositoryImpl.ts
│       └── HistoryRepositoryImpl.ts
│
├── usecases/               # 【Application層】 ユーザー操作のシナリオ
│   ├── CartUsecase.ts      # カート→購入確定の一連の流れ
│   ├── ChargeUsecase.ts    # チャージ・取り消し
│   ├── ItemUsecase.ts      # 商品登録・更新・一覧取得
│   └── UserUsecase.ts      # ユーザー登録・更新・残高照会
│
├── services/               # 【Domain Service】 純粋なビジネスロジック
│   └── CartService.ts      # 合計金額計算・残高チェック
│
├── pages/                  # 【UI】 ページコンポーネント
│   ├── buy/
│   │   ├── index.tsx       # 商品スキャン・カート
│   │   ├── payment.tsx     # 決済方法選択
│   │   ├── scan.tsx        # 学生証スキャン（シスPay）
│   │   └── confirm.tsx     # 購入確定
│   ├── charge/
│   │   └── index.tsx
│   ├── history/
│   │   └── index.tsx
│   └── admin/
│       ├── items/
│       └── users/
│
├── components/             # 【UI】 再利用可能な部品
│   ├── ui/                 # 汎用パーツ (Button, Input)
│   ├── layouts/            # ヘッダー, フッター
│   └── features/           # 特定機能に紐づくパーツ
│       ├── cart/           # CartItem, CartSummary
│       ├── item/           # ProductCard, BarcodeScanner
│       └── charge/         # ChargeForm
│
├── store/                  # 【State】 グローバル状態管理
│   └── useCartStore.ts     # CartItem[] の保持（4画面間で共有）
│
├── hooks/                  # 【Connect】 ViewとUsecaseを繋ぐフック
│   ├── useCart.ts
│   ├── useCharge.ts
│   ├── useItem.ts
│   └── useHistory.ts
│
├── types/                  # 【Domain】 型定義
│   ├── domain/             # フロント専用の型
│   │   ├── Cart.ts         # CartItem（フロント専用）
│   │   ├── Item.ts
│   │   ├── User.ts
│   │   └── History.ts
│   └── dto/                # APIと1:1対応する型
│       ├── core/
│       │   └── ApiResponse.ts        # ErrorResponse共通型
│       ├── request/
│       │   ├── Item/
│       │   │   ├── CreateItemRequest.ts
│       │   │   └── UpdateItemRequest.ts
│       │   ├── User/
│       │   │   ├── CreateUserRequest.ts
│       │   │   ├── UpdateUserRequest.ts
│       │   │   └── ChargeRequest.ts
│       │   └── Purchase/
│       │       └── PurchaseRequest.ts
│       └── response/
│           ├── Item/
│           │   ├── ItemResponse.ts
│           │   └── ItemListResponse.ts
│           ├── User/
│           │   ├── UserResponse.ts
│           │   ├── BalanceResponse.ts
│           │   └── ChargeResponse.ts
│           ├── Purchase/
│           │   └── PurchaseResponse.ts
│           └── History/
│               └── HistoryResponse.ts
│
└── utils/
    └── formatCurrency.ts


## ルーティング (Generouted)

本プロジェクトでは、ルーティングの自動生成と型安全性を確保するために **Generouted** を採用しています。
これにより、`src/pages` ディレクトリの構造がそのままアプリケーションの URL パスとして反映されます。

### 基本ルール
- **ファイルベースルーティング**: `src/pages` 内にファイルを配置すると、自動的にルートが生成されます。
- **型安全なナビゲーション**: `generouted` が提供する `useNavigate` や `Link` を使用することで、存在しないパスへの遷移をビルド時に検知できます。

### フォルダ構成と URL の対応例
| ファイルパス | 生成される URL | 備考 |
| :--- | :--- | :--- |
| `src/pages/index.tsx` | `/` | トップページ |
| `src/pages/buy/index.tsx` | `/buy` | 購入画面 |
| `src/pages/charge/index.tsx` | `/charge` | チャージ画面 |
| `src/pages/products/[id].tsx` | `/products/:id` | **動的ルーティング** (ID指定) |
| `src/pages/admin/_layout.tsx` | - | **レイアウト共有**: `admin/` 配下で共通のUIを定義 |
| `src/pages/404.tsx` | (不一致時) | 404 エラーページ |

### 動的ルーティングの利用方法 (`[id].tsx`)
特定の ID を持つ詳細画面などを作る場合は、ファイル名を `[変数名].tsx` とします。
コンポーネント内では React Router 標準の `useParams` を使用して値を取得します。

```tsx
// src/pages/products/[id].tsx の例
import { useParams } from 'react-router-dom'

export default function ProductDetail() {
  const { id } = useParams() // 型定義も自動生成される
  return <div>商品ID: {id}</div>
}