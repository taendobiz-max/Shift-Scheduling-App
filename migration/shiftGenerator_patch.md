# shiftGenerator.ts 修正パッチ

## 修正箇所

### 1. 760行目付近: `isRollCallCapable`関数の修正

**修正前:**
```typescript
return emp.roll_call_capable === true || emp.roll_call_duty === '1';
```

**修正後:**
```typescript
return emp.roll_call_capable === true;
```

### 2. 907行目付近: 点呼対応可否チェックの修正

**修正前:**
```typescript
if (emp.roll_call_capable !== true && emp.roll_call_duty !== '1') {
  console.log(`⛔ ${emp.name || empId} does not have roll call capability`);
  continue;
}
```

**修正後:**
```typescript
if (emp.roll_call_capable !== true) {
  console.log(`⛔ ${emp.name || empId} does not have roll call capability`);
  continue;
}
```

## 修正理由

- `roll_call_duty`フィールドを削除し、`roll_call_capable`のみで点呼対応可否を判定するため
- データ移行により、`roll_call_duty='1'`の従業員は`roll_call_capable=true`に更新済み
- スキルマトリクスとの組み合わせで、より柔軟なスキル管理が可能になる

## 適用方法

1. EC2サーバーにSSH接続
2. `/home/ec2-user/shift-scheduling-api/src/services/shiftGenerator.ts`を編集
3. 上記の2箇所を修正
4. APIサーバーを再起動
