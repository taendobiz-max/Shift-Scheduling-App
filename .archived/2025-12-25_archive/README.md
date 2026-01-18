# アーカイブ: 2025年12月25日

## 📋 アーカイブ理由

統合ルール管理システムの開発完了に伴い、使用されていないコードとバックアップファイルを整理しました。

---

## 🗑️ アーカイブ内容

### 未使用ファイル（4件）

#### src/utils/
1. **generic-constraint-engine.ts**
   - 理由: どこからもインポートされていない
   - 作成日: 2024年11月10日
   - 説明: 汎用制約エンジンの実装だが、実際には使用されていない

2. **constraint-evaluator.ts**
   - 理由: どこからもインポートされていない
   - 作成日: 2024年11月8日
   - 説明: 制約評価ロジックだが、実際には使用されていない

3. **constraint-types.ts**
   - 理由: constraint-evaluatorからのみ参照されているが、それ自体が未使用
   - 作成日: 2024年11月8日
   - 説明: 制約の型定義

#### src/pages/
4. **MasterDataManagement_patch.tsx**
   - 理由: どこからもインポートされていない
   - 作成日: 2024年10月28日
   - 説明: パッチファイルとして作成されたが使用されていない

---

### バックアップファイル（26件）

#### フロントエンド（9件）

**src/utils/**
- UnifiedRuleAdapter.ts.backup
- constraintEngine.ts.backup
- constraintGroupEvaluator.ts.backup
- auth.ts.backup-20251217_095055

**src/pages/**
- EmployeeManagement.tsx.backup
- EmployeeManagement.tsx.backup-20251217_071900
- Login.tsx.backup-20251217_095133
- Reports.tsx.backup
- Reports.tsx.backup2

#### バックエンド（17件）

**api-server/**
- BusinessRuleEngine.ts.backup_20251223_075722
- constraintManager.ts.backup_20251223_041755
- multi-day-integration-patch.ts.backup
- multi-day-integration-patch.ts.backup_20251216_215439
- multi-day-pair-handler.ts.backup-20251217_045810
- shiftGenerator.js.backup_20251215_085535
- shiftGenerator.js.backup_before_js_fix
- shiftGenerator.ts.backup.20251121_011627
- shiftGenerator.ts.backup_20251115_135128
- shiftGenerator.ts.backup_20251215_071625
- shiftGenerator.ts.backup_20251216_213441
- shiftGenerator.ts.backup_before_employee_id_fix
- shiftGenerator.ts.backup_final_20251115_141841
- shiftGenerator.ts.backup_prefinal_20251115_142127
- shiftGenerator.ts.backup_rollcall_final_20251116_121328

**api-server/dist/**
- server-new.js.backup-20251217_045149
- dist.backup/ (ディレクトリ全体)

---

## ✅ 安全性の確認

### 検証方法
1. 各ファイルのインポート状況を確認
2. 依存関係の分析
3. ビルドテストの実施

### 検証結果
- ✅ すべてのアーカイブファイルは稼働中のコードから参照されていない
- ✅ アーカイブ後もビルドが正常に完了
- ✅ 稼働中のコードには影響なし

---

## 📂 ディレクトリ構造

```
.archived/2025-12-25_archive/
├── README.md (このファイル)
├── unused/
│   └── src/
│       ├── utils/
│       │   ├── generic-constraint-engine.ts
│       │   ├── constraint-evaluator.ts
│       │   └── constraint-types.ts
│       └── pages/
│           └── MasterDataManagement_patch.tsx
└── backups/
    ├── src/
    │   ├── utils/
    │   │   ├── UnifiedRuleAdapter.ts.backup
    │   │   ├── constraintEngine.ts.backup
    │   │   ├── constraintGroupEvaluator.ts.backup
    │   │   └── auth.ts.backup-20251217_095055
    │   └── pages/
    │       ├── EmployeeManagement.tsx.backup
    │       ├── EmployeeManagement.tsx.backup-20251217_071900
    │       ├── Login.tsx.backup-20251217_095133
    │       ├── Reports.tsx.backup
    │       └── Reports.tsx.backup2
    └── api-server/
        ├── BusinessRuleEngine.ts.backup_20251223_075722
        ├── constraintManager.ts.backup_20251223_041755
        ├── multi-day-integration-patch.ts.backup
        ├── multi-day-integration-patch.ts.backup_20251216_215439
        ├── multi-day-pair-handler.ts.backup-20251217_045810
        ├── shiftGenerator.js.backup_20251215_085535
        ├── shiftGenerator.js.backup_before_js_fix
        ├── shiftGenerator.ts.backup.20251121_011627
        ├── shiftGenerator.ts.backup_20251115_135128
        ├── shiftGenerator.ts.backup_20251215_071625
        ├── shiftGenerator.ts.backup_20251216_213441
        ├── shiftGenerator.ts.backup_before_employee_id_fix
        ├── shiftGenerator.ts.backup_final_20251115_141841
        ├── shiftGenerator.ts.backup_prefinal_20251115_142127
        ├── shiftGenerator.ts.backup_rollcall_final_20251116_121328
        ├── dist/
        │   └── server-new.js.backup-20251217_045149
        └── dist.backup/ (ディレクトリ全体)
```

---

## 🔄 復元方法

必要に応じて、以下のコマンドでファイルを復元できます:

```bash
# 未使用ファイルの復元
cp .archived/2025-12-25_archive/unused/src/utils/generic-constraint-engine.ts src/utils/

# バックアップファイルの復元
cp .archived/2025-12-25_archive/backups/src/utils/UnifiedRuleAdapter.ts.backup src/utils/
```

---

## 📝 備考

- このアーカイブは統合ルール管理システムの開発完了後に作成されました
- すべてのファイルは安全に復元可能です
- アーカイブファイルは定期的に見直し、不要になった場合は削除できます

---

**アーカイブ作成者:** Manus AI Agent  
**アーカイブ日時:** 2025年12月25日  
**プロジェクト:** シフト管理システム - 統合ルール管理システム
