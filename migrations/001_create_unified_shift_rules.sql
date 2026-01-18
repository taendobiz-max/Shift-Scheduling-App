-- 統合シフトルールテーブル作成とデータ移行
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
  -- 'constraint' (制約条件)
  -- 'filter' (フィルター)
  -- 'assignment' (割り当てロジック)
  -- 'validation' (検証)
  -- 'optimization' (最適化)
  
  -- ルール定義（JSON）
  rule_config JSONB NOT NULL,
  
  -- 優先度・強制レベル
  priority_level INTEGER NOT NULL DEFAULT 5,
  enforcement_level VARCHAR(20) NOT NULL DEFAULT 'recommended',
  -- 'mandatory' (必須)
  -- 'recommended' (推奨)
  -- 'optional' (オプション)
  
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
  'constraint' as rule_type,
  jsonb_build_object(
    'constraint_type', constraint_type,
    'value', constraint_value,
    'original_table', 'enhanced_constraints',
    'migrated_at', NOW()
  ) as rule_config,
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
  rule_type as rule_category,
  description,
  CASE 
    WHEN 営業所 IS NOT NULL AND 営業所 != '' THEN ARRAY[営業所]
    ELSE ARRAY['全拠点']
  END as applicable_locations,
  CASE 
    WHEN rule_type = 'constraint_check' THEN 'constraint'
    WHEN rule_type = 'employee_filter' THEN 'filter'
    WHEN rule_type = 'pair_business' THEN 'validation'
    ELSE 'assignment'
  END as rule_type,
  jsonb_build_object(
    'conditions', conditions,
    'actions', actions,
    'original_table', 'business_rules',
    'migrated_at', NOW()
  ) as rule_config,
  priority,
  'recommended' as enforcement_level,
  enabled as is_active,
  created_at
FROM business_rules
WHERE NOT EXISTS (
  SELECT 1 FROM unified_shift_rules 
  WHERE rule_name = business_rules.rule_name
);

-- ===================================================================
-- Step 5: 移行結果の検証
-- ===================================================================

-- 移行データ数の確認
DO $$
DECLARE
  enhanced_count INTEGER;
  business_count INTEGER;
  unified_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO enhanced_count FROM enhanced_constraints;
  SELECT COUNT(*) INTO business_count FROM business_rules;
  SELECT COUNT(*) INTO unified_count FROM unified_shift_rules;
  
  RAISE NOTICE '=== データ移行結果 ===';
  RAISE NOTICE 'enhanced_constraints: % 件', enhanced_count;
  RAISE NOTICE 'business_rules: % 件', business_count;
  RAISE NOTICE 'unified_shift_rules: % 件', unified_count;
  RAISE NOTICE '期待値: % 件', enhanced_count + business_count;
  
  IF unified_count < enhanced_count + business_count THEN
    RAISE WARNING '移行データ数が期待値より少ない可能性があります';
  END IF;
END $$;

-- ルールタイプ別の集計
SELECT 
  rule_type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count,
  COUNT(CASE WHEN enforcement_level = 'mandatory' THEN 1 END) as mandatory_count,
  COUNT(CASE WHEN enforcement_level = 'recommended' THEN 1 END) as recommended_count,
  COUNT(CASE WHEN enforcement_level = 'optional' THEN 1 END) as optional_count
FROM unified_shift_rules
GROUP BY rule_type
ORDER BY rule_type;

-- 営業所別の集計
SELECT 
  UNNEST(applicable_locations) as location,
  COUNT(*) as rule_count
FROM unified_shift_rules
GROUP BY location
ORDER BY rule_count DESC;

-- ===================================================================
-- Step 6: 旧テーブルのバックアップ（削除はしない）
-- ===================================================================

-- 注意: 旧テーブルは削除せず、リネームして保持
-- 問題が発生した場合のロールバック用

-- ALTER TABLE enhanced_constraints RENAME TO enhanced_constraints_backup;
-- ALTER TABLE business_rules RENAME TO business_rules_backup;

-- 上記のコメントアウトを外すと、旧テーブルがバックアップされます
-- 本番環境では慎重に実行してください

-- ===================================================================
-- 完了
-- ===================================================================

RAISE NOTICE '統合テーブルの作成とデータ移行が完了しました';
