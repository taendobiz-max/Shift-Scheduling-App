# 休暇登録機能システム設計書

## 1. 実装アプローチ

### 1.1 開発方針
- 既存のシフト生成システムとシームレスに連携する休暇管理機能を追加
- Supabase PostgreSQLに新規テーブル`vacation_masters`を作成
- React + TypeScript + shadcn-uiで管理者向けの直感的なUI実装
- 既存の`NonWorkingMember`インターフェースとの互換性を保持

### 1.2 主要機能
1. **休暇登録機能**: 管理者が従業員の休暇を事前登録
2. **休暇一覧・編集機能**: 登録済み休暇の確認・修正・削除
3. **シフト連携機能**: シフト生成時に休暇データを自動反映
4. **データ検証機能**: 重複チェック・整合性チェック

### 1.3 技術スタック
- **フロントエンド**: React 18, TypeScript, Tailwind CSS, shadcn-ui
- **バックエンド**: Supabase PostgreSQL, Supabase REST API
- **データ処理**: 既存のExcel読み込み機能を活用
- **状態管理**: React Hooks (useState, useEffect)

## 2. 主要なユーザー・UI相互作用パターン

### 2.1 休暇登録フロー
1. **管理者ログイン** → 休暇管理画面にアクセス
2. **拠点選択** → プルダウンから対象拠点を選択
3. **従業員選択** → 選択拠点の従業員一覧から選択
4. **日付選択** → カレンダーUIで休暇日を選択
5. **理由入力** → テキスト入力で休暇理由を記載
6. **登録実行** → バリデーション後にデータベース保存

### 2.2 休暇管理フロー
1. **一覧表示** → 登録済み休暇の検索・フィルタリング
2. **編集・削除** → 個別休暇データの修正・削除
3. **一括操作** → 複数休暇の一括削除・エクスポート

### 2.3 シフト連携フロー
1. **シフト生成開始** → 期間・拠点指定でシフト生成
2. **休暇データ取得** → 該当期間の休暇データを自動取得
3. **非勤務者統合** → 休暇データを非勤務者欄に表示
4. **ドラッグ&ドロップ** → 手動調整も可能

## 3. データ構造とインターフェース概要

### 3.1 新規データ構造

```typescript
// 休暇マスタテーブル
interface VacationMaster {
  id: string;                    // UUID主キー
  employee_id: string;           // 従業員ID
  employee_name: string;         // 従業員名
  location: string;              // 拠点
  vacation_date: string;         // 休暇日 (YYYY-MM-DD)
  reason: string;                // 休暇理由
  created_at: string;            // 作成日時
  updated_at: string;            // 更新日時
  created_by: string;            // 作成者
}

// 休暇登録リクエスト
interface VacationRequest {
  employee_id: string;
  employee_name: string;
  location: string;
  vacation_date: string;
  reason: string;
}
```

### 3.2 サービスインターフェース

```typescript
interface IVacationService {
  createVacation(vacation: VacationRequest): Promise<VacationMaster>;
  getVacationsByDateRange(startDate: string, endDate: string): Promise<VacationMaster[]>;
  getVacationsByLocation(location: string): Promise<VacationMaster[]>;
  updateVacation(id: string, vacation: Partial<VacationRequest>): Promise<VacationMaster>;
  deleteVacation(id: string): Promise<boolean>;
}
```

### 3.3 既存システムとの連携

```typescript
// 既存のNonWorkingMemberに拡張
interface NonWorkingMember {
  id: string;
  date: string;
  employeeName: string;
  employeeId: string;
  reason?: string;
  source?: 'manual' | 'vacation_master';  // 追加: データソース識別
}
```

## 4. プログラム呼び出しフロー概要

### 4.1 休暇登録フロー
```
VacationManagementPage
  ├── loadEmployees() → EmployeeService → Excel読み込み
  ├── handleSubmit() → VacationService.createVacation()
  └── validateVacation() → 重複チェック・整合性チェック
```

### 4.2 シフト生成連携フロー
```
ShiftGenerator
  ├── loadVacationMasters() → VacationService.getVacationsByDateRange()
  ├── convertVacationToNonWorking() → データ変換
  └── mergeVacationWithNonWorking() → 既存非勤務者と統合
```

### 4.3 データ同期フロー
```
Database (vacation_masters)
  ↓ (SELECT by date range)
VacationService
  ↓ (convert to NonWorkingMember format)
ShiftGenerator
  ↓ (merge with manual non-working)
UI Display (非勤務者欄)
```

## 5. データベースER図概要

### 5.1 新規テーブル: vacation_masters
- **主キー**: id (UUID)
- **ユニーク制約**: (employee_id, vacation_date) - 同一従業員の同一日重複防止
- **インデックス**: vacation_date, location, employee_id - 検索性能向上
- **外部キー**: なし（Excelデータとの論理的関連のみ）

### 5.2 既存テーブルとの関係
- **employee_master.xlsx**: employee_idで論理的関連
- **shifts**: 日付・従業員での競合チェック
- **business_masters**: 直接関連なし

## 6. 不明な点・前提条件

### 6.1 前提条件
1. **権限管理**: 管理者権限の実装は既存システムに依存
2. **データ整合性**: 従業員マスタ（Excel）が最新であることを前提
3. **タイムゾーン**: 日付はローカルタイム（日本時間）で統一
4. **バックアップ**: Supabaseの自動バックアップ機能を活用

### 6.2 要確認事項
1. **休暇理由の標準化**: プルダウン選択か自由入力か
2. **承認フロー**: 休暇登録に承認プロセスが必要か
3. **通知機能**: 休暇登録時の関係者への通知要否
4. **履歴管理**: 休暇データの変更履歴保持要否
5. **一括登録**: CSVインポート等の一括登録機能要否

### 6.3 技術的検討事項
1. **パフォーマンス**: 大量データ（1000名×365日）での性能要件
2. **同時実行制御**: 複数管理者による同時編集の制御方法
3. **データ移行**: 既存の手動非勤務者データの移行方針
4. **API制限**: Supabaseの利用制限との適合性確認

## 7. 実装優先度

### 7.1 Phase 1 (必須機能)
- vacation_mastersテーブル作成
- 基本的な休暇登録UI
- シフト生成時の休暇データ連携

### 7.2 Phase 2 (拡張機能)
- 休暇一覧・検索・フィルタリング
- 編集・削除機能
- バリデーション強化

### 7.3 Phase 3 (将来拡張)
- 一括登録機能
- 承認フロー
- レポート・分析機能