# チェックポイント情報

## 作成日時
2025-12-15 18:39:52 (JST)

## Git情報
- **コミットハッシュ**: `fa27bb6a4b76ff91becdbbe09e3b519b87677841`
- **コミットメッセージ**: SelectItemの空文字列エラーを修正
- **コミット日時**: 2025-12-14 05:06:16 +0000

## バックアップファイル
- **コードバックアップ**: `~/shift-app/api-server/.checkpoints/20251215_183952/`
  - shiftGenerator.ts
  - BusinessRuleEngine.ts
  - server.ts

- **データベースバックアップ**: `~/shift-app/api-server/.checkpoints/db_backup_1765842015973.json`
  - Business masters: 63件
  - Shifts: 0件

## 現在の仕様（ロールバック対象）

### STD便の業務マスタ
```json
{
  "業務id": "STD_OUT",
  "業務名": "STD便（往路）",
  "業務グループ": "STD便",
  "業務タイプ": "overnight_outbound",
  "方向": "outbound",
  "ペア業務id": null
}

{
  "業務id": "STD_RET",
  "業務名": "STD便（復路）",
  "業務グループ": "STD便",
  "業務タイプ": "overnight_return",
  "方向": "return",
  "ペア業務id": null
}
```

### シフト生成ロジック
- PHASE 1: ペア業務（業務グループが同じ業務をグループ化）
- PHASE 2: 個別業務
- overnight業務はペア業務から除外されている

### 問題点
- 1日目往路 → 2日目復路のペアリングが実装されていない
- 各日で同じ人が往路と復路を担当してしまう

## ロールバック手順

### コードのロールバック
```bash
cd ~/shift-app/api-server
cp .checkpoints/20251215_183952/shiftGenerator.ts ./
cp .checkpoints/20251215_183952/BusinessRuleEngine.ts ./
cp .checkpoints/20251215_183952/server.ts ./
npx tsc shiftGenerator.ts --target ES2020 --module commonjs --esModuleInterop --skipLibCheck
npx tsc BusinessRuleEngine.ts --target ES2020 --module commonjs --esModuleInterop --skipLibCheck
npx tsc server.ts --target ES2020 --module commonjs --esModuleInterop --skipLibCheck
pm2 restart api-server
```

### または Gitでロールバック
```bash
cd ~/shift-app
git checkout fa27bb6a4b76ff91becdbbe09e3b519b87677841
cd api-server
npm run build  # または適切なビルドコマンド
pm2 restart api-server
```

### データベースのロールバック
業務マスタに変更を加えた場合のみ必要
```bash
cd ~/shift-app/api-server
node -e "
const fs = require('fs');
const backup = JSON.parse(fs.readFileSync('.checkpoints/db_backup_1765842015973.json'));
console.log('Backup contains:', backup.business_masters.length, 'business masters');
// 必要に応じて復元スクリプトを実行
"
```

## 新しい実装（2日セット方式）

### 目標
- 夜行バスを2日間セットの1業務として扱う
- Galaxy班とAube班で1日ずらした業務マスタを作成
- 1人が2日間（往路+復路）を担当

### 実装予定
1. データモデル拡張（duration_days, day_schedules）
2. シフト生成ロジック修正
3. 業務マスタに2日セット業務を追加

## 重要な注意事項
⚠️ このチェックポイントは、2日セット方式の実装が失敗した場合に、現在の仕様に戻るために使用します。
⚠️ 実装中に問題が発生した場合は、このファイルの情報を参照してロールバックしてください。
