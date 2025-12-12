-- Constraint Schema Extension for Flexible Constraint Management
-- 制約条件管理の機能拡張

-- 1. Add new columns to enhanced_constraints table
ALTER TABLE app_9213e72257_enhanced_constraints
ADD COLUMN IF NOT EXISTS constraint_scope VARCHAR(20) DEFAULT 'employee' 
  CHECK (constraint_scope IN ('employee', 'business', 'date', 'office', 'global')),
ADD COLUMN IF NOT EXISTS evaluation_timing VARCHAR(20) DEFAULT 'pre_assignment'
  CHECK (evaluation_timing IN ('pre_assignment', 'post_generation', 'cumulative')),
ADD COLUMN IF NOT EXISTS condition_rules JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS calculation_formula JSONB DEFAULT '{}'::jsonb;

-- 2. Add comments for new columns
COMMENT ON COLUMN app_9213e72257_enhanced_constraints.constraint_scope IS '制約のスコープ: employee(従業員), business(業務), date(日付), office(拠点), global(全体)';
COMMENT ON COLUMN app_9213e72257_enhanced_constraints.evaluation_timing IS '評価タイミング: pre_assignment(割当前), post_generation(生成後), cumulative(累積)';
COMMENT ON COLUMN app_9213e72257_enhanced_constraints.condition_rules IS '制約の条件ルール(JSON形式)';
COMMENT ON COLUMN app_9213e72257_enhanced_constraints.calculation_formula IS '制約の計算式(JSON形式)';

-- 3. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_enhanced_constraints_scope 
  ON app_9213e72257_enhanced_constraints(constraint_scope);
CREATE INDEX IF NOT EXISTS idx_enhanced_constraints_timing 
  ON app_9213e72257_enhanced_constraints(evaluation_timing);
CREATE INDEX IF NOT EXISTS idx_enhanced_constraints_condition_rules 
  ON app_9213e72257_enhanced_constraints USING GIN(condition_rules);

-- 4. Update existing constraints with new fields
UPDATE app_9213e72257_enhanced_constraints
SET 
  constraint_scope = 'employee',
  evaluation_timing = 'pre_assignment'
WHERE constraint_type = 'max_consecutive_days';

UPDATE app_9213e72257_enhanced_constraints
SET 
  constraint_scope = 'employee',
  evaluation_timing = 'pre_assignment'
WHERE constraint_type = 'min_rest_hours';

UPDATE app_9213e72257_enhanced_constraints
SET 
  constraint_scope = 'employee',
  evaluation_timing = 'cumulative'
WHERE constraint_type IN ('max_weekly_hours', 'max_monthly_hours');

UPDATE app_9213e72257_enhanced_constraints
SET 
  constraint_scope = 'office',
  evaluation_timing = 'post_generation'
WHERE constraint_type = 'daily_coverage';

UPDATE app_9213e72257_enhanced_constraints
SET 
  constraint_scope = 'employee',
  evaluation_timing = 'pre_assignment'
WHERE constraint_type = 'max_shifts_per_day';

-- 5. Insert new constraint types

-- 月間休暇日数制約
INSERT INTO app_9213e72257_enhanced_constraints (
  constraint_name,
  constraint_category,
  constraint_type,
  constraint_value,
  constraint_description,
  applicable_locations,
  priority_level,
  enforcement_level,
  constraint_scope,
  evaluation_timing,
  condition_rules,
  is_active
) VALUES (
  '月間休暇日数',
  'その他',
  'monthly_days_off',
  6,
  '月間で最低6日の休暇を確保',
  ARRAY['全拠点'],
  15,
  'strict',
  'employee',
  'cumulative',
  '{
    "calculation": "count_days_without_shift",
    "period": "monthly",
    "min_required": 6
  }'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- 手当付き業務の均等配分制約
INSERT INTO app_9213e72257_enhanced_constraints (
  constraint_name,
  constraint_category,
  constraint_type,
  constraint_value,
  constraint_description,
  applicable_locations,
  priority_level,
  enforcement_level,
  constraint_scope,
  evaluation_timing,
  condition_rules,
  calculation_formula,
  is_active
) VALUES (
  '手当付き業務の均等配分',
  'その他',
  'allowance_balance',
  1,
  '手当付き業務の割り当て数の差を±1以内に抑える',
  ARRAY['全拠点'],
  25,
  'flexible',
  'business',
  'cumulative',
  '{
    "business_filter": "has_allowance = true",
    "balance_type": "count",
    "max_difference": 1
  }'::jsonb,
  '{
    "calculate": "max(employee_allowance_count) - min(employee_allowance_count)",
    "condition": "result <= max_difference"
  }'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- 友引の日の出勤人数制約
INSERT INTO app_9213e72257_enhanced_constraints (
  constraint_name,
  constraint_category,
  constraint_type,
  constraint_value,
  constraint_description,
  applicable_locations,
  priority_level,
  enforcement_level,
  constraint_scope,
  evaluation_timing,
  condition_rules,
  calculation_formula,
  is_active
) VALUES (
  '友引の日の追加出勤人数',
  'その他',
  'daily_extra_staff',
  10,
  '友引の日は未アサイン5名、通常日は10名を確保',
  ARRAY['全拠点'],
  20,
  'strict',
  'date',
  'post_generation',
  '{
    "tomobiki_extra": 5,
    "normal_extra": 10,
    "date_type_field": "is_tomobiki"
  }'::jsonb,
  '{
    "calculate": "count_unassigned_employees",
    "condition": "result >= required_extra"
  }'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- 6. Create calendar table for special dates (友引など)
CREATE TABLE IF NOT EXISTS app_9213e72257_calendar_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  is_tomobiki BOOLEAN DEFAULT FALSE,
  is_holiday BOOLEAN DEFAULT FALSE,
  holiday_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_dates_date ON app_9213e72257_calendar_dates(date);
CREATE INDEX IF NOT EXISTS idx_calendar_dates_tomobiki ON app_9213e72257_calendar_dates(is_tomobiki);
CREATE INDEX IF NOT EXISTS idx_calendar_dates_holiday ON app_9213e72257_calendar_dates(is_holiday);

COMMENT ON TABLE app_9213e72257_calendar_dates IS 'カレンダー日付マスタ - 友引、祝日などの特殊日を管理';

-- 7. Create function to auto-update calendar updated_at
CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_calendar_updated_at ON app_9213e72257_calendar_dates;
CREATE TRIGGER trigger_update_calendar_updated_at
  BEFORE UPDATE ON app_9213e72257_calendar_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

-- 8. Insert sample calendar data for 2025-11
-- 友引は六曜に基づいて計算（簡易版として手動設定）
INSERT INTO app_9213e72257_calendar_dates (date, is_tomobiki, is_holiday, holiday_name)
VALUES
  ('2025-11-03', false, true, '文化の日'),
  ('2025-11-06', true, false, null),
  ('2025-11-08', true, false, null),
  ('2025-11-12', true, false, null),
  ('2025-11-14', true, false, null),
  ('2025-11-18', true, false, null),
  ('2025-11-20', true, false, null),
  ('2025-11-23', false, true, '勤労感謝の日'),
  ('2025-11-24', true, false, null),
  ('2025-11-28', true, false, null),
  ('2025-11-30', true, false, null)
ON CONFLICT (date) DO UPDATE SET
  is_tomobiki = EXCLUDED.is_tomobiki,
  is_holiday = EXCLUDED.is_holiday,
  holiday_name = EXCLUDED.holiday_name;

-- 9. Create view for constraint summary with new fields
CREATE OR REPLACE VIEW constraint_summary_extended AS
SELECT 
  c.id,
  c.constraint_name,
  c.constraint_category,
  c.constraint_type,
  c.constraint_value,
  c.constraint_scope,
  c.evaluation_timing,
  c.enforcement_level,
  c.priority_level,
  c.applicable_locations,
  c.condition_rules,
  c.is_active,
  COUNT(v.id) as violation_count,
  COUNT(CASE WHEN v.resolved = false THEN 1 END) as unresolved_violations
FROM app_9213e72257_enhanced_constraints c
LEFT JOIN app_9213e72257_constraint_violations v ON c.id = v.constraint_id
  AND v.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.id
ORDER BY c.priority_level, c.constraint_name;

COMMENT ON VIEW constraint_summary_extended IS '拡張制約条件サマリービュー - 過去30日間の違反数を含む';
