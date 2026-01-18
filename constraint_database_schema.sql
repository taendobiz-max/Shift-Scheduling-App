-- Enhanced Constraint Management Database Schema
-- Based on Bob's design specifications

-- Create enhanced constraints table
CREATE TABLE IF NOT EXISTS app_9213e72257_enhanced_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_name VARCHAR(100) NOT NULL,
  constraint_category VARCHAR(20) NOT NULL CHECK (constraint_category IN ('法令遵守', 'その他')),
  constraint_type VARCHAR(50) NOT NULL,
  constraint_value INTEGER NOT NULL,
  constraint_description TEXT,
  applicable_locations TEXT[] NOT NULL DEFAULT '{}',
  priority_level INTEGER NOT NULL CHECK (priority_level >= 0 AND priority_level <= 100),
  enforcement_level VARCHAR(20) NOT NULL CHECK (enforcement_level IN ('mandatory', 'strict', 'flexible')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(50)
);

-- Create constraint violations table
CREATE TABLE IF NOT EXISTS app_9213e72257_constraint_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_id UUID NOT NULL REFERENCES app_9213e72257_enhanced_constraints(id) ON DELETE CASCADE,
  shift_generation_batch_id VARCHAR(100),
  employee_id VARCHAR(50) NOT NULL,
  violation_date DATE NOT NULL,
  violation_type VARCHAR(50) NOT NULL,
  violation_description TEXT NOT NULL,
  severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('critical', 'warning', 'info')),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_enhanced_constraints_category ON app_9213e72257_enhanced_constraints(constraint_category);
CREATE INDEX IF NOT EXISTS idx_enhanced_constraints_priority ON app_9213e72257_enhanced_constraints(priority_level);
CREATE INDEX IF NOT EXISTS idx_enhanced_constraints_active ON app_9213e72257_enhanced_constraints(is_active);
CREATE INDEX IF NOT EXISTS idx_enhanced_constraints_locations ON app_9213e72257_enhanced_constraints USING GIN(applicable_locations);
CREATE INDEX IF NOT EXISTS idx_enhanced_constraints_type ON app_9213e72257_enhanced_constraints(constraint_type);

CREATE INDEX IF NOT EXISTS idx_constraint_violations_date ON app_9213e72257_constraint_violations(violation_date);
CREATE INDEX IF NOT EXISTS idx_constraint_violations_employee ON app_9213e72257_constraint_violations(employee_id);
CREATE INDEX IF NOT EXISTS idx_constraint_violations_severity ON app_9213e72257_constraint_violations(severity_level);
CREATE INDEX IF NOT EXISTS idx_constraint_violations_batch ON app_9213e72257_constraint_violations(shift_generation_batch_id);
CREATE INDEX IF NOT EXISTS idx_constraint_violations_resolved ON app_9213e72257_constraint_violations(resolved);

-- Insert sample constraint data
INSERT INTO app_9213e72257_enhanced_constraints (
  constraint_name,
  constraint_category,
  constraint_type,
  constraint_value,
  constraint_description,
  applicable_locations,
  priority_level,
  enforcement_level,
  is_active
) VALUES 
(
  '労働基準法 - 最大連続出勤日数',
  '法令遵守',
  'max_consecutive_days',
  6,
  '労働基準法に基づく最大連続出勤日数制限（6日まで）',
  ARRAY['全拠点'],
  0,
  'mandatory',
  true
),
(
  '勤務間インターバル規制',
  '法令遵守',
  'min_rest_hours',
  11,
  '勤務間インターバル規制（11時間以上の休息時間確保）',
  ARRAY['全拠点'],
  0,
  'mandatory',
  true
),
(
  '週40時間労働制限',
  '法令遵守',
  'max_weekly_hours',
  40,
  '労働基準法に基づく週40時間労働制限',
  ARRAY['全拠点'],
  5,
  'mandatory',
  true
),
(
  '月間最大労働時間制限',
  '法令遵守',
  'max_monthly_hours',
  160,
  '月間最大労働時間制限（160時間）',
  ARRAY['全拠点'],
  10,
  'strict',
  true
),
(
  '川越拠点 - 業務カバレッジ',
  'その他',
  'daily_coverage',
  2,
  '川越拠点では各業務に最低2名配置',
  ARRAY['川越'],
  20,
  'strict',
  true
),
(
  '東京拠点 - 業務カバレッジ',
  'その他',
  'daily_coverage',
  3,
  '東京拠点では各業務に最低3名配置',
  ARRAY['東京'],
  25,
  'strict',
  true
),
(
  '1日最大シフト数制限',
  'その他',
  'max_shifts_per_day',
  1,
  '1人が1日に担当できる最大シフト数',
  ARRAY['全拠点'],
  30,
  'flexible',
  true
);

-- Create constraint statistics view
CREATE OR REPLACE VIEW constraint_statistics AS
SELECT 
  COUNT(*) as total_constraints,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_constraints,
  COUNT(CASE WHEN constraint_category = '法令遵守' THEN 1 END) as legal_compliance_constraints,
  COUNT(CASE WHEN constraint_category = 'その他' THEN 1 END) as other_constraints,
  COUNT(CASE WHEN enforcement_level = 'mandatory' THEN 1 END) as mandatory_constraints,
  COUNT(CASE WHEN enforcement_level = 'strict' THEN 1 END) as strict_constraints,
  COUNT(CASE WHEN enforcement_level = 'flexible' THEN 1 END) as flexible_constraints,
  COUNT(CASE WHEN priority_level = 0 THEN 1 END) as priority_0_constraints,
  COUNT(CASE WHEN priority_level BETWEEN 1 AND 20 THEN 1 END) as high_priority_constraints,
  COUNT(CASE WHEN priority_level BETWEEN 21 AND 50 THEN 1 END) as medium_priority_constraints,
  COUNT(CASE WHEN priority_level BETWEEN 51 AND 100 THEN 1 END) as low_priority_constraints
FROM app_9213e72257_enhanced_constraints;

-- Create violation statistics view
CREATE OR REPLACE VIEW violation_statistics AS
SELECT 
  COUNT(*) as total_violations,
  COUNT(CASE WHEN resolved = false THEN 1 END) as unresolved_violations,
  COUNT(CASE WHEN severity_level = 'critical' THEN 1 END) as critical_violations,
  COUNT(CASE WHEN severity_level = 'warning' THEN 1 END) as warning_violations,
  COUNT(CASE WHEN severity_level = 'info' THEN 1 END) as info_violations,
  COUNT(DISTINCT employee_id) as affected_employees,
  COUNT(DISTINCT violation_date) as affected_dates
FROM app_9213e72257_constraint_violations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Add constraint compliance check column to shifts table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_9213e72257_shifts' 
    AND column_name = 'constraint_compliance_checked'
  ) THEN
    ALTER TABLE app_9213e72257_shifts 
    ADD COLUMN constraint_compliance_checked BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add constraint violations summary column to shift generations table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_9213e72257_shift_generations' 
    AND column_name = 'constraint_violations_summary'
  ) THEN
    ALTER TABLE app_9213e72257_shift_generations 
    ADD COLUMN constraint_violations_summary JSONB;
  END IF;
END $$;

-- Create function to update constraint statistics
CREATE OR REPLACE FUNCTION update_constraint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_constraint_updated_at ON app_9213e72257_enhanced_constraints;
CREATE TRIGGER trigger_update_constraint_updated_at
  BEFORE UPDATE ON app_9213e72257_enhanced_constraints
  FOR EACH ROW
  EXECUTE FUNCTION update_constraint_updated_at();

COMMENT ON TABLE app_9213e72257_enhanced_constraints IS '拡張制約条件マスタテーブル - 法令遵守とその他の制約を管理';
COMMENT ON TABLE app_9213e72257_constraint_violations IS '制約違反記録テーブル - シフト生成時の制約違反を記録';
COMMENT ON VIEW constraint_statistics IS '制約条件統計ビュー';
COMMENT ON VIEW violation_statistics IS '制約違反統計ビュー（過去30日間）';
