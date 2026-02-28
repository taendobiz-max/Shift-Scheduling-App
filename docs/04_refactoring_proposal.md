# リファクタリング提案書

**作成日**: 2026年2月28日  
**最終更新日**: 2026年2月28日（フェーズ1一部完了を反映）  
**対象システム**: シフト管理アプリケーション（manus-shift-app）  
**解析対象**: `src/pages/`（10,743行）、`src/components/`、`src/utils/`

---

## 1. 総評

本システムは機能的には完成度が高く、実際の業務で稼働しています。一方で、コードの規模が急速に拡大した結果、いくつかの技術的負債が蓄積しています。以下に、優先度・影響度・実装コストの観点から分類したリファクタリング提案を示します。

> **フェーズ1の進捗**: 不要ファイルの整理・定数の一元管理・未使用パッケージの整理は**完了済み**です。稼働ファイル数は141ファイルに削減されました。

---

## 2. 高優先度（即時対応推奨）

### 2.1. 巨大コンポーネントの分割

**問題**: `ShiftSchedule.tsx`（2,481行）と `ShiftGenerator.tsx`（1,832行）は、単一のコンポーネントとして過大な責務を持っています。これにより、コードの読み解きが困難になり、バグの混入リスクが高まっています。

**影響**: 保守性・可読性・テスト容易性が著しく低下

**提案**:

```
ShiftSchedule.tsx (2,481行) → 分割案
├── ShiftSchedule.tsx          # メインコンテナ（状態管理・ルーティング）
├── ShiftScheduleMatrix.tsx    # マトリクス表示コンポーネント
├── ShiftScheduleToolbar.tsx   # ツールバー（フィルタ・ボタン類）
├── ShiftScheduleExport.tsx    # エクスポート機能
└── hooks/
    ├── useShiftScheduleData.ts  # データ取得ロジック
    └── useShiftScheduleEdit.ts  # 編集ロジック

ShiftGenerator.tsx (1,832行) → 分割案
├── ShiftGenerator.tsx           # メインコンテナ
├── ShiftGeneratorForm.tsx       # 生成条件入力フォーム
├── ShiftGeneratorMatrix.tsx     # 結果マトリクス表示
├── UnassignedEmployeePanel.tsx  # 未アサインパネル（フローティング）
└── hooks/
    ├── useShiftGeneration.ts    # 生成ロジック
    └── useShiftDragDrop.ts      # DnD ロジック
```

**実装コスト**: 高（段階的に実施することを推奨）

---

### 2.2. カスタムフック（Custom Hooks）への抽出

**問題**: データ取得・状態管理・ビジネスロジックが UI コンポーネント内に直接記述されており、ロジックの再利用が困難です。

**影響**: テスト容易性・再利用性が低い

**提案**: 以下のカスタムフックを作成します。

```typescript
// データ取得フック
hooks/useEmployees.ts        // 従業員データの取得・キャッシュ
hooks/useBusinessMaster.ts   // 業務マスタの取得・キャッシュ
hooks/useVacations.ts        // 休暇データの取得
hooks/useShiftResults.ts     // シフト結果の取得・更新

// ロジックフック
hooks/useShiftDragDrop.ts    // DnD ロジック（handleDragEnd等）
hooks/useShiftSave.ts        // シフト保存ロジック
hooks/useRuleCheck.ts        // ルールチェックロジック
```

**実装コスト**: 中

---

### ~~2.3. 不要ファイルの整理~~ — **完了済み**

> **2026年2月28日に完了**: 25ファイルを `src/_archive/` ディレクトリに移動しました。バックアップファイル（`.backup`、`.bak`、`.old`）、アーカイブファイル（`.archived`）、パッチファイル、src直下の重複ファイル、非推奨ユーティリティをすべて整理しました。稼働ファイル数は141ファイルに削減されています。

---

## 3. 中優先度（計画的に対応）

### 3.1. データ取得の一元化（React Query の活用）

**問題**: 各コンポーネントで個別に `supabase.from(...).select(...)` を呼び出しており、同じデータを複数箇所で重複取得しています。また、キャッシュ管理が行われていません。

**影響**: 不要なAPIリクエストの発生、データの不整合リスク

**提案**: `@tanstack/react-query`（既にインストール済み）を活用して、データ取得を一元化します。

```typescript
// 現在の実装（各コンポーネントに散在）
const [employees, setEmployees] = useState([]);
useEffect(() => {
  const { data } = await supabase.from('employees').select('*');
  setEmployees(data);
}, []);

// 提案する実装（React Query）
const { data: employees } = useQuery({
  queryKey: ['employees'],
  queryFn: () => supabase.from('employees').select('*').then(r => r.data)
});
```

**実装コスト**: 中

---

### 3.2. `business_master` テーブルのカラム名の英語化

**問題**: `business_master` テーブルのカラム名（`業務id`、`業務名`、`営業所` など）が日本語で定義されており、SQL クエリや TypeScript の型定義が複雑になっています。

**影響**: コードの可読性低下、ORM ツールとの互換性問題、将来的な国際化対応の困難

**提案**: カラム名を英語に変更します。

| 現在のカラム名 | 提案するカラム名 |
|---|---|
| `業務id` | `business_id` |
| `業務名` | `business_name` |
| `営業所` | `office` |
| `業務グループ` | `business_group` |
| `スキルマップ項目` | `skill_map_item` |
| `ペア業務id` | `pair_business_id` |
| `開始時間` | `start_time` |
| `終了時間` | `end_time` |
| `早朝手当` | `early_morning_allowance` |
| `深夜手当` | `late_night_allowance` |

**実装コスト**: 高（DB マイグレーションとフロントエンドの全参照箇所の修正が必要）

---

### 3.3. `UnifiedRuleManager.ts` の実装完成

**問題**: `UnifiedRuleManager.ts` には複数の `TODO` コメントが残っており、フィルター評価・割り当てロジック・検証・最適化の各評価関数が未実装（スタブ状態）です。

**影響**: 統合ルール管理機能が完全には機能していない

**対象 TODO**:
```typescript
// TODO: フィルター評価ロジックを実装
// TODO: 割り当てロジック評価を実装
// TODO: 検証評価を実装
// TODO: 最適化評価を実装
```

**提案**: 各評価関数を `ruleChecker.ts` の既存ロジックを参考に実装します。

**実装コスト**: 高

---

### 3.4. エラーハンドリングの統一

**問題**: エラーハンドリングが各コンポーネントで個別に実装されており、エラーメッセージの表示方法や処理が統一されていません。

**影響**: ユーザー体験の不統一、エラーの見落としリスク

**提案**:
1. グローバルエラーハンドラーを実装（`react-error-boundary` は既にインストール済み）
2. Supabase エラーを統一的に処理するユーティリティ関数を作成
3. トースト通知（`@radix-ui/react-toast` は既にインストール済み）を使ったエラー表示の統一

**実装コスト**: 中

---

### 3.5. 型定義の強化

**問題**: 一部のコードで `any` 型が使用されており、TypeScript の型安全性が損なわれています。

**影響**: バグの早期発見が困難、IDE の補完機能が効かない

**提案**:
```typescript
// 現在（any型の使用例）
const { data: existingShifts } = await supabase
  .from('shifts').select('*');
existingShifts.map((s: any) => s.shift_date)

// 提案（型定義の活用）
interface ShiftRecord {
  id: string;
  employee_id: string;
  shift_date: string;
  // ...
}
const { data: existingShifts } = await supabase
  .from('shifts').select('*')
  .returns<ShiftRecord[]>();
existingShifts.map(s => s.shift_date) // 型安全
```

**実装コスト**: 中

---

## 4. 低優先度（余裕があれば対応）

### ~~4.1. 未使用パッケージの整理~~ — **完了済み**

> **2026年2月28日に完了**: `depcheck` で未使用パッケージを特定し、以下を削除しました。
> - `@hookform/resolvers`、`react-hook-form`、`zod`（dependencies）
> - `@tailwindcss/typography`、`@types/react-beautiful-dnd`、`react-beautiful-dnd`、`eslint-plugin-react-refresh`（devDependencies）
>
> ビルド確認済み。`src/components/ui/form.tsx` は `react-hook-form` に依存していますが、どのコンポーネントからもインポートされていないため、将来的にこのファイル自体の削除も検討可能です。

---

### ~~4.2. 定数の一元管理~~ — **完了済み**

> **2026年2月28日に完了**: `src/constants/index.ts` を新設し、以下の定数を集約しました。
> - `OFFICES` / `OFFICES_WITH_HQ` / `OFFICES_WITH_ALL`（営業所）
> - `TOKYO_TEAMS`（東京班）
> - `VACATION_TYPES`（休暇種別）
> - `VACATION_REASON_REQUESTED`（希望休理由）
> - `EMPLOYMENT_TYPES` / `EMPLOYMENT_TYPE_LABELS`（雇用形態）
>
> 13ファイルのハードコード文字列をインポートに置き換え済みです。

---

### 4.3. コンポーネントのメモ化

**問題**: 大規模なマトリクス表示において、不要な再レンダリングが発生している可能性があります。

**提案**: `React.memo`、`useMemo`、`useCallback` を適切に使用して、パフォーマンスを改善します。特に `renderDraggableCell` 関数と `DraggableEmployee` コンポーネントはメモ化の効果が高いと考えられます。

**実装コスト**: 低〜中

---

## 5. リファクタリング優先度マトリクス

| 提案 | 優先度 | 影響度 | 実装コスト | ステータス |
|---|---|---|---|---|
| 不要ファイルの整理 | 高 | 低 | 低 | **完了** |
| 定数の一元管理 | 低→高 | 低 | 低 | **完了** |
| 未使用パッケージの整理 | 低 | 低 | 低 | **完了** |
| カスタムフックへの抽出 | 高 | 高 | 中 | 未着手 |
| 巨大コンポーネントの分割 | 高 | 高 | 高 | 未着手 |
| React Query の活用 | 中 | 中 | 中 | 未着手 |
| エラーハンドリングの統一 | 中 | 中 | 中 | 未着手 |
| 型定義の強化 | 中 | 中 | 中 | 未着手 |
| UnifiedRuleManager の実装完成 | 中 | 高 | 高 | 未着手 |
| business_master カラム名英語化 | 中 | 低 | 高 | 未着手 |
| コンポーネントのメモ化 | 低 | 中 | 低〜中 | 未着手 |

---

## 6. 段階的実施ロードマップ

### フェーズ1（即時〜1ヶ月）: クリーンアップ — **一部完了**
- ~~不要ファイル・アーカイブファイルの整理~~ **完了**
- ~~定数の一元管理~~ **完了**
- ~~未使用パッケージの整理~~ **完了**
- 型定義の強化（`any` 型の排除）— 未着手

### フェーズ2（1〜3ヶ月）: ロジック分離
- カスタムフックへのロジック抽出
- React Query によるデータ取得の一元化
- エラーハンドリングの統一

### フェーズ3（3〜6ヶ月）: コンポーネント分割
- `ShiftSchedule.tsx` の段階的分割
- `ShiftGenerator.tsx` の段階的分割
- コンポーネントのメモ化

### フェーズ4（6ヶ月以降）: 機能完成
- `UnifiedRuleManager.ts` の実装完成
- `business_master` テーブルのカラム名英語化（DB マイグレーション）
