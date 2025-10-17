# シフト生成システム仕様書

## 1. システム概要

### 1.1 目的
従業員の勤務シフトを自動生成し、直感的なドラッグ&ドロップ操作で調整可能なWebアプリケーションシステム

### 1.2 対象ユーザー
- シフト管理者
- 人事担当者
- 店舗・事業所管理者

### 1.3 主要機能
- 拠点・期間指定による自動シフト生成
- ドラッグ&ドロップによる従業員配置調整
- 非勤務者（希望休・休暇）管理
- ペア業務の同一従業員アサイン
- 業務時間表示
- 変更追跡・保存機能

## 2. 機能仕様

### 2.1 シフト生成機能

#### 2.1.1 基本生成
- **入力項目**
  - 拠点選択（単一拠点 or 全拠点）
  - 開始日・終了日（期間指定）
- **処理内容**
  - 従業員データと業務マスタの照合
  - スキルマトリックスによる適性判定
  - ペア業務の同一従業員アサイン
  - 負荷分散アルゴリズムによる最適配置
- **出力結果**
  - 日付×業務マスタのマトリックス表示
  - アサイン成功・失敗統計
  - 未アサイン業務リスト

#### 2.1.2 生成アルゴリズム
```typescript
interface ShiftGenerationParams {
  employees: Employee[];
  businessMasters: BusinessMaster[];
  targetDate: string;
  pairGroups: { [key: string]: BusinessMaster[] };
}

interface ShiftGenerationResult {
  success: boolean;
  shifts: ShiftAssignment[];
  violations: string[];
  unassigned_businesses: string[];
}
```

### 2.2 ドラッグ&ドロップ機能

#### 2.2.1 操作パターン
1. **従業員間スワップ**: 異なる業務・日付の従業員を入れ替え
2. **空きセルへ移動**: 従業員を未アサインのセルに移動
3. **非勤務者への移動**: 従業員を非勤務者欄にドラッグして希望休設定
4. **非勤務者からの復帰**: 非勤務者を通常シフトに戻す

#### 2.2.2 技術実装
- **ライブラリ**: @dnd-kit/core, @dnd-kit/utilities
- **コンポーネント**: DraggableEmployee, DroppableCell, DragOverlay
- **ID形式**: 
  - 業務セル: `${businessMaster}-${date}`
  - 非勤務者セル: `non-working-${date}`
  - シフトID: `shift_${date}_${businessName}_${index}`

#### 2.2.3 ID解析ロジック
```typescript
const parseCellId = (cellId: string): { businessName: string; date: string } | null => {
  if (cellId.startsWith('non-working-')) {
    const date = cellId.replace('non-working-', '');
    return { businessName: '', date };
  }
  
  const datePattern = /\d{4}-\d{2}-\d{2}$/;
  const match = cellId.match(datePattern);
  
  if (match) {
    const date = match[0];
    const businessName = cellId.substring(0, cellId.length - date.length - 1);
    return { businessName, date };
  }
  
  return null;
};
```

### 2.3 非勤務者管理機能

#### 2.3.1 表示形式
- 各日付列の最下段に非勤務者行を配置
- 赤系統のカラーリングで視覚的に区別
- ドロップエリアとして機能

#### 2.3.2 操作方法
- 通常シフトから非勤務者欄へのドラッグ
- 非勤務者欄から通常シフトへのドラッグ
- 理由設定（希望休・休暇等）

### 2.4 ペア業務機能

#### 2.4.1 識別方法
- 業務マスタの`ペア業務ID`または`pair_business_id`で判定
- 紫色の左線で視覚的に表示

#### 2.4.2 アサインルール
- 同一ペア業務IDを持つ業務は同一従業員にアサイン
- ドラッグ&ドロップ時もペア関係を維持

### 2.5 業務時間表示機能

#### 2.5.1 表示内容
- 各業務の開始時間・終了時間
- 時計アイコンと共に表示
- デフォルト値: 09:00-17:00

#### 2.5.2 データソース
```typescript
const getBusinessHours = (businessMaster: string) => {
  const business = businessMasters.find(bm => 
    (bm.name || bm.業務名) === businessMaster
  );
  
  if (business && business.開始時間 && business.終了時間) {
    return `${business.開始時間}-${business.終了時間}`;
  }
  
  return '09:00-17:00';
};
```

### 2.6 変更管理機能

#### 2.6.1 変更追跡
- `hasChanges`フラグによる変更状態管理
- オレンジ色のリングで変更セルを強調表示
- 変更通知アラートの表示

#### 2.6.2 操作ボタン
- **リセット**: 元の生成結果に戻す
- **保存**: Supabaseに変更を保存
- **戻る**: 生成画面に戻る

## 3. 技術仕様

### 3.1 アーキテクチャ

#### 3.1.1 フロントエンド
- **フレームワーク**: React 18 + TypeScript
- **スタイリング**: Tailwind CSS
- **UIコンポーネント**: shadcn-ui
- **ドラッグ&ドロップ**: @dnd-kit/core, @dnd-kit/utilities
- **状態管理**: React Hooks (useState, useEffect)

#### 3.1.2 バックエンド
- **データベース**: Supabase PostgreSQL
- **認証**: Supabase Auth
- **API**: Supabase REST API

#### 3.1.3 データ処理
- **Excel読み込み**: SheetJS (xlsx)
- **日付処理**: JavaScript Date API
- **ファイル操作**: File API

### 3.2 データ構造

#### 3.2.1 従業員データ
```typescript
interface Employee {
  id: string;
  name: string;
  location: string;
  従業員ID?: string;
  氏名?: string;
  拠点?: string;
}

interface EmployeeMaster {
  employee_id: string;
  name: string;
  office: string;
  department?: string;
  position?: string;
}
```

#### 3.2.2 業務マスタデータ
```typescript
interface BusinessMaster {
  id: string;
  業務名: string;
  name?: string;
  開始時間?: string;
  終了時間?: string;
  ペア業務ID?: string;
  pair_business_id?: string;
  required_skills?: string[];
  location?: string;
}
```

#### 3.2.3 シフト結果データ
```typescript
interface ShiftResult {
  date: string;
  businessMaster: string;
  employeeName: string;
  employeeId: string;
  id?: string;
}

interface NonWorkingMember {
  id: string;
  date: string;
  employeeName: string;
  employeeId: string;
  reason?: string;
}
```

#### 3.2.4 生成統計データ
```typescript
interface GenerationSummary {
  total_businesses: number;
  assigned_businesses: number;
  unassigned_businesses: number;
  total_employees: number;
}
```

### 3.3 API仕様

#### 3.3.1 Supabaseテーブル構造
```sql
-- 業務マスタテーブル
CREATE TABLE business_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  業務名 TEXT NOT NULL,
  開始時間 TIME,
  終了時間 TIME,
  ペア業務ID TEXT,
  location TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- シフトテーブル
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  business_master_id UUID REFERENCES business_masters(id),
  date DATE NOT NULL,
  location TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.3.2 主要API操作
```typescript
// 業務マスタ取得
const { data: businessMasters } = await supabase
  .from('business_masters')
  .select('*');

// シフト保存
const { error } = await supabase
  .from('shifts')
  .insert(shiftsToSave);
```

## 4. UI/UX仕様

### 4.1 画面構成

#### 4.1.1 シフト生成画面
- **ヘッダー**: タイトル「シフト生成」
- **設定エリア**: 拠点選択、開始日・終了日入力
- **生成ボタン**: シフト生成実行
- **状況表示**: データ状況、選択内容確認

#### 4.1.2 シフト結果画面
- **ヘッダー**: タイトル「シフト生成結果」、操作ボタン群
- **統計カード**: 総業務数、アサイン成功・失敗、従業員数
- **メインテーブル**: スクロール可能なシフトマトリックス
- **フッター**: 期間・拠点情報、変更状況

### 4.2 テーブルレイアウト

#### 4.2.1 構造
```
┌─────────────┬─────┬─────┬─────┐
│ 業務マスタ    │日付1 │日付2 │日付3 │ ← 固定ヘッダー
├─────────────┼─────┼─────┼─────┤
│ 業務A        │従業員│従業員│従業員│ ↑
│ 業務B        │従業員│従業員│従業員│ │
│ ...          │...  │...  │...  │ │スクロール可能
│ 業務Z        │従業員│従業員│従業員│ │
│ 非勤務者      │休暇者│休暇者│休暇者│ ↓
└─────────────┴─────┴─────┴─────┘
```

#### 4.2.2 スタイル仕様
- **最大高さ**: 600px
- **スクロール**: 縦方向のみ
- **固定ヘッダー**: `position: sticky, top: 0`
- **セル最小幅**: 120px（日付列）、200px（業務名列）

### 4.3 カラーパレット

#### 4.3.1 機能別カラー
- **通常シフト**: 青系統 (bg-blue-100, text-blue-800)
- **非勤務者**: 赤系統 (bg-red-100, text-red-800)
- **ペア業務**: 紫系統 (border-purple-400)
- **変更セル**: オレンジ系統 (ring-orange-300)
- **ドラッグ中**: 透明度50% (opacity-50)

#### 4.3.2 状態表示
- **成功**: 緑 (text-green-600)
- **警告**: オレンジ (text-orange-600)
- **エラー**: 赤 (text-red-600)
- **情報**: 青 (text-blue-600)

### 4.4 レスポンシブ対応

#### 4.4.1 ブレークポイント
- **モバイル**: 〜768px
- **タブレット**: 768px〜1024px
- **デスクトップ**: 1024px〜

#### 4.4.2 調整項目
- 統計カードのグリッド配置
- テーブルの横スクロール
- ボタンサイズとレイアウト

## 5. データ仕様

### 5.1 入力データ形式

#### 5.1.1 従業員マスタ (Excel)
**ファイル**: `/public/uploads/employee_master.xlsx`

| 列名 | データ型 | 必須 | 説明 |
|------|----------|------|------|
| 従業員ID | 文字列 | ○ | 一意識別子 |
| 氏名 | 文字列 | ○ | 従業員名 |
| 拠点 | 文字列 | ○ | 所属拠点 |
| 部署 | 文字列 | - | 所属部署 |
| 役職 | 文字列 | - | 役職名 |

#### 5.1.2 スキルマトリックス (Excel)
**ファイル**: `/public/uploads/skill_matrix.xlsx`

| 列名 | データ型 | 必須 | 説明 |
|------|----------|------|------|
| 従業員ID | 文字列 | ○ | 従業員マスタと紐付け |
| 業務名 | 文字列 | ○ | 対応可能業務 |
| スキルレベル | 数値 | - | 1-5の習熟度 |

#### 5.1.3 業務マスタ (Supabase)
```sql
業務名 TEXT NOT NULL,
開始時間 TIME,
終了時間 TIME,
ペア業務ID TEXT,
location TEXT
```

### 5.2 出力データ形式

#### 5.2.1 シフト結果 (JSON)
```json
{
  "shifts": [
    {
      "id": "shift_2024-01-15_業務A_0",
      "date": "2024-01-15",
      "businessMaster": "業務A",
      "employeeName": "田中太郎",
      "employeeId": "EMP001"
    }
  ],
  "nonWorkingMembers": [
    {
      "id": "non-working-1704067200000",
      "date": "2024-01-15",
      "employeeName": "佐藤花子",
      "employeeId": "EMP002",
      "reason": "希望休"
    }
  ],
  "summary": {
    "total_businesses": 50,
    "assigned_businesses": 45,
    "unassigned_businesses": 5,
    "total_employees": 20
  }
}
```

#### 5.2.2 CSV出力形式
```csv
日付,業務名,従業員名,従業員ID,開始時間,終了時間
2024-01-15,業務A,田中太郎,EMP001,09:00,17:00
2024-01-15,業務B,山田次郎,EMP003,10:00,18:00
```

## 6. 運用仕様

### 6.1 導入手順

#### 6.1.1 環境構築
1. **Node.js環境**: v18以上
2. **パッケージインストール**: `npm install`
3. **Supabase設定**: 環境変数設定
4. **データベース初期化**: テーブル作成

#### 6.1.2 初期データ準備
1. **従業員マスタ**: Excelファイル配置
2. **業務マスタ**: Supabaseテーブル登録
3. **スキルマトリックス**: Excelファイル配置

#### 6.1.3 起動コマンド
```bash
# 開発環境
npm run dev

# 本番ビルド
npm run build
npm run start
```

### 6.2 メンテナンス

#### 6.2.1 定期メンテナンス
- **データバックアップ**: 週次
- **ログ確認**: 日次
- **パフォーマンス監視**: 継続

#### 6.2.2 データ更新手順
1. **従業員データ**: Excelファイル差し替え
2. **業務マスタ**: Supabase管理画面から更新
3. **システム再起動**: 必要に応じて

### 6.3 トラブルシューティング

#### 6.3.1 よくある問題
- **ドラッグ&ドロップ不具合**: ブラウザキャッシュクリア
- **データ読み込みエラー**: ファイル形式・権限確認
- **生成失敗**: 従業員数と業務数のバランス確認

#### 6.3.2 ログ確認方法
```javascript
// ブラウザ開発者ツールのコンソール
console.log('🔄 Drag start:', activeId);
console.log('📝 Parsed target:', { targetBusiness, targetDate });
```

## 7. 拡張仕様

### 7.1 短期改善案

#### 7.1.1 UI/UX改善
- **キーボードショートカット**: 矢印キーでセル移動
- **一括選択**: チェックボックスで複数従業員選択
- **フィルター機能**: 業務種別・従業員スキルでフィルタ

#### 7.1.2 機能追加
- **シフトテンプレート**: よく使うパターンの保存・再利用
- **制約チェック**: 労働時間上限、連続勤務制限
- **通知機能**: 生成完了・エラー通知

### 7.2 中期改善案

#### 7.2.1 高度な生成アルゴリズム
- **機械学習**: 過去のシフトパターン学習
- **最適化**: 遺伝的アルゴリズムによる最適解探索
- **予測機能**: 需要予測に基づく人員配置

#### 7.2.2 データ連携
- **人事システム連携**: API経由での従業員データ同期
- **勤怠システム連携**: 実績データの自動取り込み
- **カレンダー連携**: Googleカレンダー等との同期

### 7.3 長期改善案

#### 7.3.1 モバイル対応
- **ネイティブアプリ**: React Native化
- **PWA対応**: オフライン機能
- **プッシュ通知**: リアルタイム更新通知

#### 7.3.2 マルチテナント対応
- **組織管理**: 複数組織の管理
- **権限制御**: 役職別アクセス制御
- **データ分離**: 組織間データ分離

## 8. セキュリティ仕様

### 8.1 認証・認可
- **Supabase Auth**: メール・パスワード認証
- **Row Level Security**: データアクセス制御
- **JWT Token**: セッション管理

### 8.2 データ保護
- **暗号化**: 通信・保存データの暗号化
- **バックアップ**: 定期的なデータバックアップ
- **監査ログ**: 操作履歴の記録

### 8.3 プライバシー
- **個人情報保護**: 従業員データの適切な管理
- **アクセス制限**: 必要最小限の権限付与
- **データ削除**: 退職者データの適切な削除

## 9. パフォーマンス仕様

### 9.1 レスポンス時間
- **シフト生成**: 10秒以内（100名×30日）
- **ドラッグ&ドロップ**: 200ms以内
- **データ保存**: 5秒以内

### 9.2 スケーラビリティ
- **従業員数**: 最大1000名
- **業務数**: 最大200業務
- **期間**: 最大3ヶ月

### 9.3 ブラウザ対応
- **Chrome**: 最新版
- **Firefox**: 最新版
- **Safari**: 最新版
- **Edge**: 最新版

---

## 付録

### A. ファイル構成
```
/workspace/shadcn-ui/
├── src/
│   ├── pages/
│   │   └── ShiftGenerator.tsx          # メインコンポーネント
│   ├── utils/
│   │   ├── shiftGenerator.ts           # シフト生成ロジック
│   │   ├── employeeExcelLoader.ts      # 従業員データ読み込み
│   │   └── businessMasterLoader.ts     # 業務マスタ読み込み
│   ├── components/ui/                  # shadcn-ui コンポーネント
│   └── lib/
│       └── supabase.ts                 # Supabase設定
├── public/
│   └── uploads/
│       ├── employee_master.xlsx        # 従業員マスタ
│       └── skill_matrix.xlsx          # スキルマトリックス
├── docs/
│   └── shift-generator-specification.md # 本仕様書
└── package.json                        # 依存関係
```

### B. 主要依存パッケージ
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/utilities": "^3.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "tailwindcss": "^3.0.0",
    "xlsx": "^0.18.0"
  }
}
```

### C. 環境変数
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

**作成日**: 2025年1月6日  
**バージョン**: 1.0  
**作成者**: シフト生成システム開発チーム  
**更新履歴**: 初版作成