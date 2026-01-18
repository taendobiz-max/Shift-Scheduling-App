# 休暇登録機能 ファイル構成

## 新規追加ファイル

```
src/
├── pages/
│   └── VacationManagement.tsx           # 休暇管理メイン画面
├── components/
│   ├── vacation/
│   │   ├── VacationForm.tsx            # 休暇登録フォーム
│   │   ├── VacationList.tsx            # 休暇一覧表示
│   │   ├── VacationCard.tsx            # 休暇情報カード
│   │   └── VacationFilters.tsx         # 検索・フィルター
│   └── ui/
│       └── date-picker.tsx             # 日付選択コンポーネント
├── services/
│   ├── vacationService.ts              # 休暇データAPI操作
│   └── employeeService.ts              # 従業員データ操作
├── hooks/
│   ├── useVacations.ts                 # 休暇データ管理フック
│   └── useEmployees.ts                 # 従業員データ管理フック
├── types/
│   └── vacation.ts                     # 休暇関連型定義
└── utils/
    ├── vacationUtils.ts                # 休暇データ変換ユーティリティ
    └── validationUtils.ts              # バリデーション関数
```

## 修正対象ファイル

```
src/
├── pages/
│   ├── ShiftGenerator.tsx              # 休暇データ連携機能追加
│   └── Index.tsx                       # 休暇管理へのナビゲーション追加
├── types/
│   └── index.ts                        # 休暇関連型定義追加
└── utils/
    └── supabaseClient.ts               # 必要に応じてテーブル型定義追加
```

## データベーススキーマファイル

```
database/
├── migrations/
│   └── 001_create_vacation_masters.sql # vacation_mastersテーブル作成DDL
├── seeds/
│   └── vacation_masters_seed.sql       # テストデータ投入SQL
└── indexes/
    └── vacation_masters_indexes.sql    # インデックス作成SQL
```

## 設定・ドキュメントファイル

```
docs/
├── vacation-api.md                     # REST API仕様書
├── vacation-ui-guide.md               # UI操作ガイド
└── vacation-database-schema.md        # データベース設計書

scripts/
├── setup-vacation-tables.sql          # 初期セットアップスクリプト
└── migrate-nonworking-data.ts         # 既存データ移行スクリプト
```

## ファイル詳細説明

### 1. メイン画面 (VacationManagement.tsx)
- 休暇登録・一覧・編集の統合画面
- タブ切り替えで機能分離
- レスポンシブ対応

### 2. フォームコンポーネント (VacationForm.tsx)
- 拠点・従業員プルダウン
- 日付選択カレンダー
- 理由入力テキストエリア
- リアルタイムバリデーション

### 3. 一覧コンポーネント (VacationList.tsx)
- ページネーション対応
- ソート・フィルタリング機能
- 編集・削除アクション

### 4. サービス層 (vacationService.ts)
- Supabase REST API操作
- エラーハンドリング
- データ変換処理

### 5. カスタムフック (useVacations.ts)
- 状態管理
- API呼び出し
- キャッシュ管理

### 6. ユーティリティ (vacationUtils.ts)
- VacationMaster ↔ NonWorkingMember変換
- 日付フォーマット処理
- データ検証関数

### 7. 型定義 (vacation.ts)
- TypeScript型定義
- API レスポンス型
- フォーム入力型

## 依存関係

```
VacationManagement
├── VacationForm (拠点・従業員選択、日付入力)
├── VacationList (一覧表示、編集・削除)
└── VacationFilters (検索・絞り込み)

VacationForm
├── EmployeeService (従業員データ取得)
├── VacationService (休暇登録)
└── ValidationUtils (入力検証)

ShiftGenerator (既存)
├── VacationService (休暇データ取得) ← 新規追加
└── VacationUtils (データ変換) ← 新規追加
```

## 実装順序

### Step 1: データベース・型定義
1. vacation_mastersテーブル作成
2. TypeScript型定義作成
3. Supabase接続確認

### Step 2: サービス層実装
1. VacationService実装
2. EmployeeService拡張
3. API動作確認

### Step 3: UI コンポーネント実装
1. VacationForm作成
2. VacationList作成
3. VacationManagement統合

### Step 4: 既存システム連携
1. ShiftGenerator修正
2. 非勤務者データ統合
3. 動作確認・テスト

### Step 5: 最終調整
1. UI/UX改善
2. パフォーマンス最適化
3. エラーハンドリング強化