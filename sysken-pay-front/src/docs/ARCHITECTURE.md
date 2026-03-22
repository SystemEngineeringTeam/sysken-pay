# ディレクトリ構成とアーキテクチャ

このプロジェクトは **Vite + React (SPA)** で構築されており、クリーンアーキテクチャ（レイヤーアーキテクチャ）の考え方を採用しています。
機能ごとではなく「役割（レイヤー）」ごとにトップレベルのディレクトリを分割しています。

## ディレクトリ構造

```text
src/
├── main.tsx                # エントリーポイント
├── App.tsx                 # 全体のプロバイダー設定
├── routes.tsx              # ルーティング定義 (React Router)
│
├── adapter/                # 【Infra層】 外部通信・実装詳細
│   ├── api/                # Axios等のクライアント設定
│   ├── repository/         # APIを叩く実装 (RepositoryImpl)
│   └── storage/            # LocalStorage操作など
│
├── usecases/               # 【Application層】 ユーザー操作のシナリオ
│   ├── CartUsecase.ts      # 「カートに追加」「会計」などの一連の流れ
│   └── AuthUsecase.ts      # ログイン処理など
│
├── services/               # 【Domain Service】 純粋なビジネスロジック
│   ├── TaxService.ts       # 税計算 (状態を持たない)
│   └── DiscountService.ts  # 割引計算
│
├── pages/                  # 【UI】 ページコンポーネント (1ページ=1ファイル)
│   ├── admin/
│   ├── buy/
│   └── charge/
│
├── components/             # 【UI】 再利用可能な部品
│   ├── ui/                 # 汎用パーツ (Button, Input)
│   ├── layouts/            # ヘッダー, フッター
│   └── features/           # 特定機能に紐づくパーツ (ProductCardなど)
│
├── store/                  # 【State】 グローバル状態管理 (Zustand/Jotai)
│   └── useCartStore.ts
│
├── hooks/                  # 【Connect】 ViewとUsecaseを繋ぐフック
│   └── useCart.ts          # UIから呼ばれるカスタムフック
│
├── types/                  # 【Domain】 型定義
│   ├── domain/             # ビジネスロジックで使う型
│   └── dto/                # APIのリクエスト/レスポンス型
│
└── utils/                  # 汎用ユーティリティ


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