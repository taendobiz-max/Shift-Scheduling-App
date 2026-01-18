const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateConstraintGroups() {
  console.log('=== 制約グループの移行開始 ===\n');
  
  // Step 1: constraint_groupsを取得
  const { data: groups, error: groupsError } = await supabase
    .from('constraint_groups')
    .select('*');
  
  if (groupsError) {
    console.error('❌ constraint_groups取得エラー:', groupsError);
    return;
  }
  
  console.log(`📊 constraint_groups: ${groups.length}件`);
  
  // Step 2: 各グループをunified_shift_rulesに移行
  for (const group of groups) {
    console.log(`\n--- グループ「${group.group_name}」を移行 ---`);
    
    // 子ルール（制約条件）を取得
    const { data: constraints, error: constraintsError } = await supabase
      .from('enhanced_constraints')
      .select('id')
      .eq('constraint_group_id', group.id);
    
    if (constraintsError) {
      console.error('❌ 子ルール取得エラー:', constraintsError);
      continue;
    }
    
    const childRuleIds = constraints.map(c => c.id);
    console.log(`  子ルール: ${childRuleIds.length}件`);
    
    // unified_shift_rulesに挿入
    const unifiedRule = {
      id: group.id, // グループIDを保持
      rule_name: group.group_name,
      rule_type: 'constraint',
      rule_category: 'グループ',
      description: group.group_description,
      applicable_locations: ['全拠点'], // デフォルト
      rule_config: {
        is_group: true,
        evaluation_logic: group.evaluation_logic,
        child_rules: childRuleIds
      },
      priority_level: group.priority_level,
      enforcement_level: 'recommended', // グループは推奨
      is_active: group.is_active
    };
    
    console.log('  変換後のルール:');
    console.log(JSON.stringify(unifiedRule, null, 2));
    
    const { data: inserted, error: insertError } = await supabase
      .from('unified_shift_rules')
      .insert(unifiedRule)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ 挿入エラー:', insertError);
      continue;
    }
    
    console.log('  ✅ 移行成功');
  }
  
  console.log('\n=== 移行完了 ===');
  
  // Step 3: 移行後の確認
  console.log('\n=== 移行後の確認 ===');
  
  const { data: allRules } = await supabase
    .from('unified_shift_rules')
    .select('rule_type')
    .eq('rule_category', 'グループ');
  
  console.log(`unified_shift_rules (constraint_group): ${allRules?.length || 0}件`);
}

migrateConstraintGroups().catch(console.error);
