# データモデル仕様書

**作成日**: 2026年2月28日  
**最終更新日**: 2026年2月28日（リファクタリング反映）  
**対象システム**: シフト管理アプリケーション（manus-shift-app）  
**バックエンド**: Supabase（PostgreSQL）

---

## 1. データベース全体構成

本システムは Supabase をバックエンドとして採用しており、PostgreSQL データベース上に以下のテーブルが構築されています。テーブルは大きく「マスタ系」「トランザクション系」「ルール系」の3カテゴリに分類されます。

| カテゴリ | テーブル名 | 概要 |
|---|---|---|
| マスタ系 | `employees` | 従業員の基本情報 |
| マスタ系 | `business_master` | 業務の定義情報 |
| トランザクション系 | `shifts` | 確定済みシフト実績 |
| トランザクション系 | `vacation_masters` | 休暇申請・確定情報 |
| ルール系 | `unified_shift_rules` | シフト生成ルール定義 |

---

## 2. テーブル詳細定義

### 2.1. `employees` — 従業員マスタ

従業員の基本情報を管理するマスタテーブルです。認証情報（`user_id`）との連携や、管理者権限の管理も兼ねています。

| カラム名 | データ型 | NULL許容 | 説明 |
|---|---|---|---|
| `id` | `uuid` | **No** | 主キー（自動生成） |
| `employee_id` | `text` | Yes | 社員番号（表示用） |
| `name` | `text` | Yes | 従業員氏名 |
| `office` | `text` | Yes | 所属営業所（例: 川越、東京） |
| `team` | `text` | Yes | 所属班（東京営業所のみ使用） |
| `roll_call_duty` | `text` | Yes | 点呼担当資格の種別 |
| `roll_call_capable` | `boolean` | Yes | 点呼担当可能フラグ |
| `is_admin` | `boolean` | Yes | 管理者権限フラグ（`true`=管理者） |
| `user_id` | `text` | Yes | Supabase Auth のユーザーIDとの連携 |
| `password_hash` | `text` | Yes | 旧システム互換用パスワードハッシュ |
| `last_login` | `timestamp with time zone` | Yes | 最終ログイン日時 |
| `display_order` | `integer` | Yes | 一覧表示時の並び順 |
| `created_at` | `timestamp with time zone` | **No** | レコード作成日時 |

**備考**: `office` カラムの値は、シフト生成・表示のフィルタリングに広く使用されます。定数 `OFFICES`（`src/constants/index.ts`）で `['川越', '東京', '川口']` として一元管理されています。`team` カラムは東京営業所の班分け（Galaxy、Aube）に使用され、定数 `TOKYO_TEAMS` で管理されています。

---

### 2.2. `business_master` — 業務マスタ

シフトで割り当てる業務の詳細を定義するテーブルです。カラム名に日本語が使用されている点が特徴です。

| カラム名 | データ型 | NULL許容 | 説明 |
|---|---|---|---|
| `業務id` | `text` | **No** | 主キー（業務識別子） |
| `業務名` | `text` | **No** | 業務の名称 |
| `営業所` | `text` | **No** | 担当営業所 |
| `業務グループ` | `text` | Yes | 所属する業務グループ |
| `スキルマップ項目` | `text` | Yes | 対応するスキル要件 |
| `ペア業務id` | `text` | Yes | ペアとなる業務のID（ペア業務の場合） |
| `開始時間` | `time` | Yes | 業務開始時刻 |
| `終了時間` | `time` | Yes | 業務終了時刻 |
| `早朝手当` | `boolean` | Yes | 早朝手当対象フラグ |
| `深夜手当` | `boolean` | Yes | 深夜手当対象フラグ |

**備考**: `ペア業務id` が設定されている業務は「ペア業務」として扱われ、シフト生成時に2名の従業員が同時にアサインされます。

---

### 2.3. `shifts` — シフト実績

生成・確定されたシフト情報を格納するトランザクションテーブルです。

| カラム名 | データ型 | NULL許容 | 説明 |
|---|---|---|---|
| `id` | `uuid` | **No** | 主キー（自動生成） |
| `employee_id` | `text` | **No** | 従業員ID（`employees.employee_id`参照） |
| `business_master_id` | `text` | **No** | 業務マスタID（`business_master.業務id`参照） |
| `business_name` | `text` | Yes | 業務名（冗長保持） |
| `shift_date` | `date` | **No** | 勤務日 |
| `location` | `text` | **No** | 勤務地（営業所） |
| `multi_day_set_id` | `text` | Yes | 連勤・複数日業務のセットID |
| `multi_day_info` | `text` | Yes | 連勤情報（例: "1/2"、"2/2"） |
| `created_at` | `timestamp with time zone` | **No** | レコード作成日時 |

**備考**: `multi_day_set_id` と `multi_day_info` は、複数日にまたがる業務（例: 2日連続の業務）を管理するために使用されます。同一セットIDを持つレコードが連勤を構成します。

---

### 2.4. `vacation_masters` — 休暇マスタ

従業員の休暇（公休・私用・病欠など）を管理するテーブルです。シフト自動生成時に参照され、休暇取得者は業務にアサインされません。

| カラム名 | データ型 | NULL許容 | 説明 |
|---|---|---|---|
| `id` | `uuid` | **No** | 主キー（自動生成） |
| `employee_id` | `text` | **No** | 従業員ID |
| `employee_name` | `text` | **No** | 従業員名（冗長保持） |
| `location` | `text` | **No** | 営業所 |
| `vacation_date` | `date` | **No** | 休暇日 |
| `vacation_type` | `text` | **No** | 休暇種別（`公休` / `私用` / `病欠` / `忌引` / `その他`） |
| `reason` | `text` | **No** | 休暇理由・備考 |
| `created_at` | `timestamp with time zone` | **No** | レコード作成日時 |
| `updated_at` | `timestamp with time zone` | **No** | レコード更新日時 |

---

### 2.5. `unified_shift_rules` — 統合シフトルール

シフト自動生成のロジックを制御するルールを一元管理するテーブルです。ルールの内容は `rule_config` カラムに JSON 形式で格納されるため、コードを変更せずにルールの追加・変更が可能です。

| カラム名 | データ型 | NULL許容 | 説明 |
|---|---|---|---|
| `id` | `uuid` | **No** | 主キー（自動生成） |
| `rule_name` | `text` | **No** | ルール名 |
| `rule_category` | `text` | **No** | ルールカテゴリ（例: `勤務時間`, `スキル要件`） |
| `description` | `text` | Yes | ルールの説明文 |
| `applicable_locations` | `text[]` | **No** | 適用対象の営業所（配列、空配列=全営業所） |
| `rule_type` | `text` | **No** | ルール種別（`constraint` / `filter` / `assignment` / `validation` / `optimization`） |
| `rule_config` | `jsonb` | **No** | ルールの詳細設定（JSON形式） |
| `priority_level` | `integer` | **No** | 優先度（0〜10、数値が大きいほど高優先） |
| `enforcement_level` | `text` | **No** | 強制レベル（`mandatory` / `recommended` / `optional`） |
| `is_active` | `boolean` | **No** | 有効フラグ（`false`=無効化） |
| `created_at` | `timestamp with time zone` | **No** | レコード作成日時 |
| `updated_at` | `timestamp with time zone` | **No** | レコード更新日時 |

---

## 3. 主要な TypeScript 型定義

フロントエンドで使用される主要な型定義です。ソースコードの `src/types/` ディレクトリに格納されています。

### 3.1. `ShiftResult` — シフト結果型

シフト自動生成の結果や画面上のシフト情報を表現する中心的な型です。`src/types/shift.ts` に定義されています。

```typescript
export interface ShiftResult {
  id: string;                    // 一意識別子（DnD操作用）
  employeeId: string;            // 従業員ID
  employeeName: string;          // 従業員名
  businessMaster: string;        // 業務マスタID
  businessName: string;          // 業務名（表示用）
  date: string;                  // 勤務日（YYYY-MM-DD形式）
  isLocked: boolean;             // ロックフラグ（編集不可）
  multi_day_set_id?: string;     // 連勤セットID
  multi_day_info?: string;       // 連勤情報（例: "1/2"）
}
```

### 3.2. `UnifiedRule` — 統合ルール型

`unified_shift_rules` テーブルに対応する型です。`src/types/unifiedRule.ts` に定義されています。

```typescript
export type RuleType = 'constraint' | 'filter' | 'assignment' | 'validation' | 'optimization';
export type EnforcementLevel = 'mandatory' | 'recommended' | 'optional';

export interface UnifiedRule {
  id: string;
  rule_name: string;
  rule_category: string;
  description?: string;
  applicable_locations: string[];
  rule_type: RuleType;
  rule_config: RuleConfig;       // JSON形式のルール設定
  priority_level: number;
  enforcement_level: EnforcementLevel;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
```

### 3.3. `VacationMaster` — 休暇マスタ型

`vacation_masters` テーブルに対応する型です。`src/types/vacation.ts` に定義されています。

```typescript
export type VacationType = '公休' | '私用' | '病欠' | '忌引' | 'その他';

export interface VacationMaster {
  id: string;
  employee_id: string;
  employee_name: string;
  location: string;
  vacation_date: string;         // YYYY-MM-DD形式
  vacation_type: VacationType;
  reason: string;
  created_at?: string;
  updated_at?: string;
}
```

### 3.4. 定数定義 — `src/constants/index.ts`

アプリケーション全体で使用する定数を一元管理するファイルです。各コンポーネントはこのファイルからインポートして使用します。

```typescript
// 営業所（拠点）
export const OFFICES = ['川越', '東京', '川口'] as const;
export const OFFICES_WITH_HQ = ['川越', '東京', '川口', '本社'] as const;
export const OFFICES_WITH_ALL = ['全拠点', ...OFFICES] as const;

// 東京営業所の班
export const TOKYO_TEAMS = ['Galaxy', 'Aube', '無し'] as const;

// 休暇種別
export const VACATION_TYPES = ['公休', '私用', '病欠', '忌引', 'その他'] as const;

// 希望休の理由文字列（シフト生成時に使用）
export const VACATION_REASON_REQUESTED = '希望休' as const;

// 雇用形態
export const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract'] as const;
```

---

## 4. テーブル間のリレーション

```
employees (id, employee_id)
    │
    ├──→ shifts (employee_id) : 1対多
    └──→ vacation_masters (employee_id) : 1対多

business_master (業務id)
    └──→ shifts (business_master_id) : 1対多

unified_shift_rules : 独立テーブル（シフト生成ロジックを制御）
```

**注意**: 現在のスキーマでは外部キー制約は明示的に設定されておらず、アプリケーション側でリレーションを管理しています。

---

## 5. アーカイブ済みファイル

以下のファイルは過去のシステムから移行・廃止されたもので、`src/_archive/` ディレクトリにアーカイブされています。実稼働環境では使用されていません。

| アーカイブパス | 元のパス | 説明 |
|---|---|---|
| `src/_archive/types/constraint.ts.archived` | `src/types/constraint.ts.archived` | 旧制約グループ型定義 |
| `src/_archive/utils/constraintEngine.ts.archived` | `src/utils/constraintEngine.ts.archived` | 旧制約エンジン |
| `src/_archive/utils/constraintGroupEvaluator.ts.archived` | `src/utils/constraintGroupEvaluator.ts.archived` | 旧制約グループ評価ロジック |
| `src/_archive/utils/constraintManager.ts.archived` | `src/utils/constraintManager.ts.archived` | 旧制約マネージャー |
| `src/_archive/utils/shiftGenerator.ts.bak` | `src/utils/shiftGenerator.ts.bak` | 旧シフト生成ロジック（APIサーバーに移行済み） |
| `src/_archive/pages/ConstraintGroupManagement.tsx.archived` | `src/pages/ConstraintGroupManagement.tsx.archived` | 旧制約グループ管理画面 |
| `src/_archive/pages/UserRegistration_backup.tsx` | `src/pages/UserRegistration_backup.tsx` | ユーザー登録画面バックアップ |
| `src/_archive/components/ShiftSchedule.tsx.backup_*` | `src/components/ShiftSchedule.tsx.backup_*` | シフト管理画面バックアップ |
| `src/_archive/utils/deprecated/` | `src/utils/.deprecated/` | 非推奨ユーティリティ |

アーカイブディレクトリには合計25ファイルが格納されています。
