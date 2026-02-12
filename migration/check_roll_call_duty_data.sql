-- roll_call_dutyフィールドのデータ確認スクリプト
-- このスクリプトを実行して、現状のデータを確認します

-- 1. roll_call_duty='1'の従業員数を確認
SELECT 
  COUNT(*) as total_employees_with_roll_call_duty
FROM employees
WHERE roll_call_duty = '1';

-- 2. roll_call_duty='1'の従業員の詳細を確認
SELECT 
  id,
  employee_id,
  name,
  office,
  roll_call_duty,
  roll_call_capable
FROM employees
WHERE roll_call_duty = '1'
ORDER BY office, employee_id;

-- 3. roll_call_duty='1'だが、roll_call_capable=falseの従業員を確認（データ不整合のチェック）
SELECT 
  id,
  employee_id,
  name,
  office,
  roll_call_duty,
  roll_call_capable
FROM employees
WHERE roll_call_duty = '1' AND (roll_call_capable IS NULL OR roll_call_capable = false);

-- 4. roll_call_duty='1'の従業員のスキルマトリクスを確認
SELECT 
  e.id,
  e.employee_id,
  e.name,
  e.office,
  bg.group_name,
  sm.has_skill
FROM employees e
LEFT JOIN skill_matrix sm ON e.id = sm.employee_id
LEFT JOIN business_groups bg ON sm.business_group_id = bg.id
WHERE e.roll_call_duty = '1' AND bg.group_name LIKE '%点呼%'
ORDER BY e.office, e.employee_id, bg.group_name;

-- 5. roll_call_duty='1'だが、点呼スキルがない従業員を確認（移行が必要な従業員）
SELECT DISTINCT
  e.id,
  e.employee_id,
  e.name,
  e.office
FROM employees e
WHERE e.roll_call_duty = '1'
  AND NOT EXISTS (
    SELECT 1
    FROM skill_matrix sm
    JOIN business_groups bg ON sm.business_group_id = bg.id
    WHERE sm.employee_id = e.id
      AND bg.group_name LIKE '%点呼%'
      AND sm.has_skill = true
  )
ORDER BY e.office, e.employee_id;
