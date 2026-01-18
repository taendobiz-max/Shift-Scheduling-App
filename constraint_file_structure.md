# 制約条件管理機能 ファイル構成

## 新規追加ファイル

```
src/
├── components/
│   ├── constraints/
│   │   ├── ConstraintForm.tsx              # 制約条件入力フォーム
│   │   ├── ConstraintList.tsx              # 制約条件一覧表示
│   │   ├── ConstraintCard.tsx              # 制約条件カード
│   │   ├── LocationSelector.tsx            # 拠点複数選択コンポーネント
│   │   ├── PrioritySlider.tsx              # 優先度スライダー
│   │   ├── ConstraintTypeSelector.tsx      # 制約タイプ選択
│   │   └── ViolationReport.tsx             # 制約違反レポート
│   └── ui/
│       ├── multi-select.tsx                # 複数選択コンポーネント
│       └── priority-indicator.tsx          # 優先度表示インジケーター
├── services/
│   ├── constraintService.ts                # 制約条件CRUD操作
│   ├── constraintValidator.ts              # 制約検証エンジン
│   └── violationReporter.ts               # 違反レポート生成
├── hooks/
│   ├── useConstraints.ts                   # 制約条件管理フック
│   ├── useConstraintValidation.ts          # 制約検証フック
│   └── useLocationFilter.ts               # 拠点フィルタリングフック
├── types/
│   └── constraint.ts                       # 制約関連型定義
└── utils/
    ├── constraintUtils.ts                  # 制約ユーティリティ関数
    ├── priorityManager.ts                  # 優先度管理
    └── violationAnalyzer.ts               # 違反分析ユーティリティ
```

## 修正対象ファイル

```
src/
├── pages/
│   ├── MasterDataManagement.tsx            # 制約条件タブの新仕様対応
│   └── ShiftGenerator.tsx                  # 制約適用機能統合
├── types/
│   └── index.ts                            # 制約関連型定義追加
├── utils/
│   └── shiftGenerator.ts                   # 制約エンジン統合
└── lib/
    └── supabase.ts                         # 新テーブル型定義追加
```

## データベーススキーマファイル

```
database/
├── migrations/
│   ├── 002_create_shift_constraints.sql   # 新制約条件テーブル作成
│   ├── 003_create_constraint_violations.sql # 制約違反テーブル作成
│   └── 004_migrate_existing_constraints.sql # 既存データ移行
├── seeds/
│   ├── constraint_categories.sql           # 制約カテゴリマスタ
│   └── sample_constraints.sql              # サンプル制約データ
└── indexes/
    └── constraint_performance_indexes.sql  # パフォーマンス向上用インデックス
```

## 設定・ドキュメントファイル

```
docs/
├── constraint-api.md                       # 制約API仕様書
├── constraint-validation-rules.md         # 制約検証ルール仕様
└── constraint-migration-guide.md          # 既存システム移行ガイド

config/
├── constraint-categories.json             # 制約カテゴリ設定
└── priority-rules.json                    # 優先度ルール設定
```

## ファイル詳細説明

### 1. 制約フォームコンポーネント (ConstraintForm.tsx)
```typescript
interface ConstraintFormProps {
  constraint?: ShiftConstraint;
  locations: string[];
  onSubmit: (constraint: ConstraintRequest) => Promise<void>;
  onCancel: () => void;
}

// 主要機能:
// - 制約タイプ選択（法令遵守/その他）
// - 拠点複数選択チェックボックス
// - 優先度スライダー（0-100）
// - リアルタイムバリデーション
```

### 2. 制約検証エンジン (constraintValidator.ts)
```typescript
class ConstraintValidator {
  // 制約を優先度順に適用
  async validateShifts(shifts: Shift[], constraints: ShiftConstraint[]): Promise<ValidationResult>;
  
  // 個別制約の検証
  validateConsecutiveDays(shifts: Shift[], constraint: ShiftConstraint): ConstraintViolation[];
  validateRestTime(shifts: Shift[], constraint: ShiftConstraint): ConstraintViolation[];
  validateWeeklyHours(shifts: Shift[], constraint: ShiftConstraint): ConstraintViolation[];
}
```

### 3. 拠点選択コンポーネント (LocationSelector.tsx)
```typescript
interface LocationSelectorProps {
  availableLocations: string[];
  selectedLocations: string[];
  onChange: (locations: string[]) => void;
  multiple: boolean;
}

// 主要機能:
// - チェックボックスによる複数拠点選択
// - 全選択/全解除機能
// - 選択状態の視覚的表示
```

### 4. 優先度管理 (priorityManager.ts)
```typescript
class PriorityManager {
  // 制約を優先度順にソート
  sortConstraintsByPriority(constraints: ShiftConstraint[]): ShiftConstraint[];
  
  // 優先度の重複チェック
  checkPriorityConflicts(constraints: ShiftConstraint[]): PriorityConflict[];
  
  // 法令遵守制約の最優先処理
  ensureLegalCompliancePriority(constraints: ShiftConstraint[]): ShiftConstraint[];
}
```

### 5. 制約サービス (constraintService.ts)
```typescript
class ConstraintService {
  // 拠点別制約条件取得
  async getConstraintsByLocation(locations: string[]): Promise<ShiftConstraint[]>;
  
  // 制約条件の作成・更新・削除
  async createConstraint(constraint: ConstraintRequest): Promise<ShiftConstraint>;
  async updateConstraint(id: string, updates: Partial<ConstraintRequest>): Promise<ShiftConstraint>;
  async deleteConstraint(id: string): Promise<boolean>;
  
  // 制約違反の記録
  async recordViolations(violations: ConstraintViolation[]): Promise<void>;
}
```

## 実装順序と依存関係

### Step 1: データベース基盤
1. 新制約条件テーブル作成
2. 制約違反テーブル作成
3. 既存データ移行スクリプト実行

### Step 2: 型定義・ユーティリティ
1. constraint.ts（型定義）作成
2. constraintUtils.ts（ユーティリティ）作成
3. priorityManager.ts（優先度管理）作成

### Step 3: サービス層実装
1. constraintService.ts作成
2. constraintValidator.ts作成
3. violationReporter.ts作成

### Step 4: UIコンポーネント実装
1. LocationSelector.tsx作成
2. PrioritySlider.tsx作成
3. ConstraintForm.tsx作成
4. ConstraintList.tsx作成

### Step 5: 既存システム統合
1. MasterDataManagement.tsx更新
2. shiftGenerator.ts拡張
3. ShiftGenerator.tsx統合

### Step 6: テスト・最適化
1. 制約検証ロジックテスト
2. UI/UXテスト
3. パフォーマンス最適化

## 依存関係図

```
ConstraintManagement (Page)
├── ConstraintForm
│   ├── LocationSelector
│   ├── PrioritySlider
│   └── ConstraintTypeSelector
├── ConstraintList
│   └── ConstraintCard
└── ViolationReport

ConstraintService
├── ConstraintValidator
├── PriorityManager
└── ViolationReporter

ShiftGenerator (Enhanced)
├── ConstraintValidator
└── ConstraintService
```

この構成により、制約条件の新仕様（法令遵守/その他の分類、拠点複数選択、優先度管理）に完全対応し、既存システムとの統合も円滑に行えます。