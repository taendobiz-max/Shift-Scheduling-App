# 制約条件管理機能 新仕様対応システム設計書

## 1. 制約条件テーブル設計（DDL含む）

### 1.1 新仕様対応テーブル構造

```sql
-- 制約条件マスタテーブル（新仕様対応版）
CREATE TABLE shift_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_name VARCHAR(100) NOT NULL,
  constraint_type VARCHAR(20) NOT NULL CHECK (constraint_type IN ('legal_compliance', 'other')),
  constraint_category VARCHAR(50) NOT NULL,
  constraint_value INTEGER NOT NULL,
  priority INTEGER NOT NULL CHECK (priority >= 0 AND priority <= 100),
  applicable_locations TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(50)
);

-- 制約違反記録テーブル
CREATE TABLE constraint_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_id UUID NOT NULL REFERENCES shift_constraints(id),
  shift_id UUID REFERENCES shifts(id),
  employee_id VARCHAR(50) NOT NULL,
  shift_date DATE NOT NULL,
  violation_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description TEXT NOT NULL,
  suggested_action TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_constraints_type ON shift_constraints(constraint_type);
CREATE INDEX idx_constraints_priority ON shift_constraints(priority);
CREATE INDEX idx_constraints_active ON shift_constraints(is_active);
CREATE INDEX idx_constraints_locations ON shift_constraints USING GIN(applicable_locations);

CREATE INDEX idx_violations_date ON constraint_violations(shift_date);
CREATE INDEX idx_violations_employee ON constraint_violations(employee_id);
CREATE INDEX idx_violations_severity ON constraint_violations(severity);

-- 既存shiftsテーブルに制約チェック済みフラグを追加
ALTER TABLE shifts ADD COLUMN constraint_compliance_checked BOOLEAN DEFAULT FALSE;
```

### 1.2 制約カテゴリ定義

```typescript
const CONSTRAINT_CATEGORIES = {
  LEGAL_COMPLIANCE: {
    consecutive_days: '最大連続勤務日数',
    rest_time: '最小休息時間',
    weekly_hours: '週間最大勤務時間',
    monthly_hours: '月間最大勤務時間',
    overtime_limit: '時間外労働上限'
  },
  OTHER: {
    daily_coverage: '業務毎日必要人数',
    skill_matching: 'スキル適合性',
    workload_balance: '負荷分散',
    preference_priority: '希望優先度'
  }
};
```

## 2. 制約条件管理画面の設計

### 2.1 画面レイアウト

```
┌─────────────────────────────────────────────────────────┐
│ 制約条件管理                                             │
├─────────────────────────────────────────────────────────┤
│ 制約名        [テキスト入力]                             │
│ 制約タイプ    ○法令遵守 ○その他                         │
│ 制約カテゴリ  [プルダウン選択]                           │
│ 制約値        [数値入力]                                 │
│ 優先度        [0-100スライダー] ※0が最高優先度           │
│ 適用拠点      ☑川越 ☑東京 ☑川口                        │
│ 説明          [テキストエリア]                           │
│ 有効状態      [トグルスイッチ]                           │
│                                                         │
│ [登録] [キャンセル] [リセット]                           │
├─────────────────────────────────────────────────────────┤
│ 登録済み制約条件一覧                                     │
│ ┌───┬─────┬─────┬─────┬─────┬─────┬─────┐ │
│ │優先│制約名│タイプ│カテゴリ│値│拠点│操作│ │
│ │0  │連続勤務│法令│consecutive│6 │川越│編集│ │
│ │1  │休息時間│法令│rest_time │8 │全拠点│編集│ │
│ │10 │負荷分散│その他│balance  │5 │東京│編集│ │
│ └───┴─────┴─────┴─────┴─────┴─────┴─────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.2 UIコンポーネント設計

```typescript
// 制約条件管理メインコンポーネント
interface ConstraintManagementProps {
  locations: string[];
  onConstraintChange: (constraints: ShiftConstraint[]) => void;
}

// 制約フォームコンポーネント
interface ConstraintFormProps {
  constraint?: ShiftConstraint;
  locations: string[];
  onSubmit: (constraint: ConstraintRequest) => Promise<void>;
  onCancel: () => void;
}

// 拠点選択コンポーネント
interface LocationSelectorProps {
  availableLocations: string[];
  selectedLocations: string[];
  onChange: (locations: string[]) => void;
  multiple?: boolean;
}

// 優先度スライダーコンポーネント
interface PrioritySliderProps {
  value: number;
  onChange: (priority: number) => void;
  showLabels?: boolean;
}
```

## 3. シフト生成アルゴリズムへの制約適用方法

### 3.1 制約適用フロー

```typescript
class EnhancedShiftGenerator {
  async generateShiftsWithConstraints(
    employees: Employee[],
    businessMasters: BusinessMaster[],
    targetDate: string,
    location: string
  ): Promise<GenerationResult> {
    
    // 1. 適用可能な制約条件を取得（優先度順）
    const constraints = await this.getApplicableConstraints(location);
    
    // 2. 初期シフト生成
    let shifts = await this.generateInitialShifts(employees, businessMasters, targetDate);
    
    // 3. 制約を優先度順に適用
    const violations: ConstraintViolation[] = [];
    
    for (const constraint of constraints) {
      const result = await this.applyConstraint(shifts, constraint);
      shifts = result.adjustedShifts;
      violations.push(...result.violations);
      
      // 法令遵守制約の場合は強制的に修正
      if (constraint.constraint_type === 'legal_compliance' && result.violations.length > 0) {
        shifts = await this.forceConstraintCompliance(shifts, constraint);
      }
    }
    
    // 4. 制約違反レポート生成
    await this.saveConstraintViolations(violations);
    
    return {
      success: true,
      shifts,
      violations: violations.map(v => v.description),
      constraintReport: this.generateConstraintReport(violations)
    };
  }
}
```

### 3.2 制約検証ロジック

```typescript
class ConstraintValidator {
  validateConsecutiveDays(
    employeeShifts: Shift[], 
    maxDays: number
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const sortedShifts = employeeShifts.sort((a, b) => a.date.localeCompare(b.date));
    
    let consecutiveCount = 1;
    for (let i = 1; i < sortedShifts.length; i++) {
      const prevDate = new Date(sortedShifts[i - 1].date);
      const currDate = new Date(sortedShifts[i].date);
      const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        consecutiveCount++;
        if (consecutiveCount > maxDays) {
          violations.push({
            constraint_id: 'consecutive_days_constraint',
            violation_type: 'consecutive_days_exceeded',
            severity: 'critical',
            employee_id: sortedShifts[i].employee_id,
            shift_date: sortedShifts[i].date,
            description: `連続勤務日数が${maxDays}日を超過しました（${consecutiveCount}日）`,
            suggested_action: `${sortedShifts[i].date}のシフトを他の従業員に変更してください`
          });
        }
      } else {
        consecutiveCount = 1;
      }
    }
    
    return violations;
  }
  
  validateRestTime(
    shifts: Shift[], 
    minRestHours: number
  ): ConstraintViolation[] {
    // 休息時間制約の検証ロジック
    // 実装詳細...
  }
  
  validateWeeklyHours(
    shifts: Shift[], 
    maxWeeklyHours: number
  ): ConstraintViolation[] {
    // 週間勤務時間制約の検証ロジック
    // 実装詳細...
  }
}
```

## 4. 既存システムとの連携・移行方法

### 4.1 既存制約条件テーブルからの移行

```sql
-- 既存データの新テーブルへの移行
INSERT INTO shift_constraints (
  constraint_name,
  constraint_type,
  constraint_category,
  constraint_value,
  priority,
  applicable_locations,
  description,
  is_active
)
SELECT 
  constraint_name,
  CASE 
    WHEN constraint_type IN ('max_consecutive_days', 'min_rest_days') THEN 'legal_compliance'
    ELSE 'other'
  END as constraint_type,
  constraint_type as constraint_category,
  constraint_value,
  CASE constraint_type
    WHEN 'max_consecutive_days' THEN 0
    WHEN 'min_rest_days' THEN 1
    ELSE 10
  END as priority,
  ARRAY['川越', '東京', '川口'] as applicable_locations,
  constraint_description,
  is_active
FROM app_9213e72257_shift_constraints;
```

### 4.2 ShiftGenerator.tsxの拡張

```typescript
// 既存のShiftGeneratorクラスに制約機能を追加
export class ShiftGenerator {
  private constraintValidator: ConstraintValidator;
  
  async initialize(): Promise<void> {
    // 既存の初期化処理
    await this.loadExistingData();
    
    // 制約バリデーターの初期化
    this.constraintValidator = new ConstraintValidator();
    await this.constraintValidator.loadConstraints();
  }
  
  async generateShifts(
    startDate: string,
    endDate: string,
    location: string,
    createdBy: string = 'system'
  ): Promise<GenerationResult> {
    // 既存の生成ロジック
    const baseResult = await this.generateBaseShifts(startDate, endDate, createdBy);
    
    // 制約適用
    const constraintResult = await this.applyConstraints(
      baseResult.shifts, 
      location
    );
    
    return {
      ...baseResult,
      shifts: constraintResult.adjustedShifts,
      violations: [...baseResult.violations, ...constraintResult.violations],
      constraintReport: constraintResult.report
    };
  }
}
```

### 4.3 MasterDataManagement.tsxの更新

```typescript
// 制約条件タブの新仕様対応
const CONSTRAINT_TYPES = [
  { value: 'legal_compliance', label: '法令遵守', color: 'red' },
  { value: 'other', label: 'その他', color: 'blue' }
];

const CONSTRAINT_CATEGORIES = {
  legal_compliance: [
    { value: 'consecutive_days', label: '最大連続勤務日数' },
    { value: 'rest_time', label: '最小休息時間' },
    { value: 'weekly_hours', label: '週間最大勤務時間' }
  ],
  other: [
    { value: 'daily_coverage', label: '業務毎日必要人数' },
    { value: 'workload_balance', label: '負荷分散' }
  ]
};
```

## 5. 実装手順

### Phase 1: データベース構造更新
1. **新制約条件テーブル作成**
   - shift_constraintsテーブルの新仕様対応
   - constraint_violationsテーブル作成
   - 必要なインデックス作成

2. **既存データ移行**
   - 旧制約条件データの新テーブルへの移行
   - 優先度とタイプの自動設定
   - データ整合性チェック

### Phase 2: 制約管理UI実装
1. **制約条件管理画面の更新**
   - 制約タイプ選択（法令遵守/その他）
   - 拠点複数選択チェックボックス
   - 優先度スライダー（0-100）

2. **バリデーション機能**
   - フォーム入力検証
   - 制約条件の重複チェック
   - 優先度の重複警告

### Phase 3: 制約エンジン実装
1. **ConstraintValidatorクラス作成**
   - 各制約タイプの検証ロジック
   - 優先度順制約適用
   - 違反レポート生成

2. **ShiftGeneratorの拡張**
   - 制約適用機能の統合
   - 法令遵守制約の強制適用
   - 制約違反時の自動修正

### Phase 4: 統合テスト・最適化
1. **制約適用テスト**
   - 各制約タイプの動作確認
   - 優先度順適用の検証
   - パフォーマンステスト

2. **UI/UX改善**
   - 制約違反の視覚的表示
   - 制約レポートの見やすさ改善
   - エラーハンドリング強化

## 6. 技術的考慮事項

### 6.1 パフォーマンス最適化
- 制約条件のキャッシュ機能
- 大量シフトデータでの制約チェック最適化
- インデックスを活用した高速検索

### 6.2 拡張性
- 新しい制約タイプの追加容易性
- カスタム制約ルールの実装可能性
- 他システムとの制約データ連携

### 6.3 運用性
- 制約違反の自動通知機能
- 制約適用状況のモニタリング
- 制約条件の履歴管理

---

**設計完了項目:**
- ✅ 制約条件テーブル設計（DDL含む）
- ✅ 制約条件管理画面の設計
- ✅ シフト生成アルゴリズムへの制約適用方法
- ✅ 既存システムとの連携・移行方法
- ✅ 実装手順

この設計により、法令遵守と運用効率を両立した制約条件管理システムを実現できます。優先度による制約適用順序の制御と、拠点別の柔軟な制約設定により、複雑な業務要件に対応可能です。