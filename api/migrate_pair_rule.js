const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migratePairRule() {
  console.log('=== ペア業務連続割り当てルールの移行開始 ===\n');
  
  // business_rulesから「ペア業務連続割り当て」を取得
  const { data: pairRule, error: pairRuleError } = await supabase
    .from('business_rules')
    .select('*')
    .eq('rule_name', 'ペア業務連続割り当て')
    .single();
  
  if (pairRuleError) {
    console.error('ペア業務連続割り当て取得エラー:', pairRuleError);
    return;
  }
  
  console.log('取得したルール:');
  console.log(JSON.stringify(pairRule, null, 2));
  console.log('\n---\n');
  
  // unified_shift_rules形式に変換
  const unifiedRule = {
    rule_name: pairRule.rule_name,
    rule_type: 'assignment', // employee_filter → assignment
    rule_category: 'ペア割り当て',
    description: pairRule.description,
    applicable_locations: pairRule.営業所 ? [pairRule.営業所] : ['全拠点'],
    priority_level: Math.floor(pairRule.priority / 10), // 100 → 10
    enforcement_level: 'recommended',
    rule_config: {
      handler: pairRule.actions?.assign_pair?.handler || 'consecutive_pair',
      conditions: pairRule.conditions,
      actions: pairRule.actions,
      params: pairRule.actions?.assign_pair?.params || {}
    },
    is_active: pairRule.enabled
  };
  
  console.log('変換後のルール:');
  console.log(JSON.stringify(unifiedRule, null, 2));
  console.log('\n---\n');
  
  // unified_shift_rulesに挿入
  const { data: insertedRule, error: insertError } = await supabase
    .from('unified_shift_rules')
    .insert(unifiedRule)
    .select()
    .single();
  
  if (insertError) {
    console.error('挿入エラー:', insertError);
    return;
  }
  
  console.log('✅ 移行成功！');
  console.log('挿入されたルール:');
  console.log(JSON.stringify(insertedRule, null, 2));
  
  console.log('\n=== 移行完了 ===');
}

migratePairRule().catch(console.error);
