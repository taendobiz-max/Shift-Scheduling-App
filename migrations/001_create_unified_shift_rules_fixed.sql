-- 統合シフトルールテーブル作成とデータ移行（修正版）
-- 実行日: 2025-12-22

-- ===================================================================
-- Step 1: 統合テーブル作成
-- ===================================================================

CREATE TABLE IF NOT EXISTS unified_shift_rules (
  -- 基本情報
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(200) NOT NULL,
  rule_category VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- 適用範囲
  applicable_locations TEXT[] NOT NULL DEFAULT '{"全拠点"}',
  applicable_business_groups TEXT[] DEFAULT NULL,
  applicable_employees TEXT[] DEFAULT NULL,
  
  -- ルールタイプ
  rule_type VARCHAR(50) NOT NULL,
  
  -- ルール定義（JSON）
  rule_config JSONB NOT NULL,
  
  -- 優先度・強制レベル
  priority_level INTEGER NOT NULL DEFAULT 5,
  enforcement_level VARCHAR(20) NOT NULL DEFAULT 'recommended',
  
  -- 状態管理
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- メタデータ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  
  -- 制約
  CONSTRAINT valid_enforcement CHECK (enforcement_level IN ('mandatory', 'recommended', 'optional')),
  CONSTRAINT valid_priority CHECK (priority_level BETWEEN 0 AND 10),
  CONSTRAINT valid_rule_type CHECK (rule_type IN ('constraint', 'filter', 'assignment', 'validation', 'optimization'))
);

-- ===================================================================
-- Step 2: インデックス作成
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_unified_rules_location 
  ON unified_shift_rules USING GIN (applicable_locations);

CREATE INDEX IF NOT EXISTS idx_unified_rules_type 
  ON unified_shift_rules (rule_type);

CREATE INDEX IF NOT EXISTS idx_unified_rules_active 
  ON unified_shift_rules (is_active);

CREATE INDEX IF NOT EXISTS idx_unified_rules_priority 
  ON unified_shift_rules (priority_level);

CREATE INDEX IF NOT EXISTS idx_unified_rules_category 
  ON unified_shift_rules (rule_category);

-- ===================================================================
-- Step 3: enhanced_constraints からデータ移行
-- ===================================================================

INSERT INTO unified_shift_rules (
  rule_name,
  rule_category,
  description,
  applicable_locations,
  rule_type,
  rule_config,
  priority_level,
  enforcement_level,
  is_active,
  created_at
)
SELECT 
  constraint_name,
  constraint_category,
  constraint_description,
  applicable_locations,
  'constraint',
  jsonb_build_object(
    'constraint_type', constraint_type,
    'value', constraint_value,
    'original_table', 'enhanced_constraints',
    'migrated_at', NOW()
  ),
  priority_level,
  enforcement_level,
  is_active,
  created_at
FROM enhanced_constraints
WHERE NOT EXISTS (
  SELECT 1 FROM unified_shift_rules 
  WHERE rule_name = enhanced_constraints.constraint_name
);

-- ===================================================================
-- Step 4: business_rules からデータ移行
-- ===================================================================

INSERT INTO unified_shift_rules (
  rule_name,
  rule_category,
  description,
  applicable_locations,
  rule_type,
  rule_config,
  priority_level,
  enforcement_level,
  is_active,
  created_at
)
SELECT 
  rule_name,
  rule_type,
  description,
  CASE 
    WHEN 営業所 IS NOT NULL AND 営業所 != '' THEN ARRAY[営業所]
    ELSE ARRAY['全拠点']
  END,
  CASE 
    WHEN rule_type = 'constraint_check' THEN 'constraint'
    WHEN rule_type = 'employee_filter' THEN 'filter'
    WHEN rule_type = 'pair_business' THEN 'validation'
    ELSE 'assignment'
  END,
  jsonb_build_object(
    'conditions', conditions,
    'actions', actions,
    'original_table', 'business_rules',
    'migrated_at', NOW()
  ),
  priority,
  'recommended',
  enabled,
  created_at
FROM business_rules
WHERE NOT EXISTS (
  SELECT 1 FROM unified_shift_rules 
  WHERE rule_name = business_rules.rule_name
);
