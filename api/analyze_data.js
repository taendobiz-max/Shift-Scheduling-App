const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeData() {
  console.log('=== データ分析開始 ===\n');
  
  // enhanced_constraints
  const { data: constraints, error: constraintsError } = await supabase
    .from('enhanced_constraints')
    .select('*');
  
  if (constraintsError) {
    console.error('enhanced_constraints取得エラー:', constraintsError);
  } else {
    console.log(`enhanced_constraints: ${constraints.length}件`);
    if (constraints.length > 0) {
      console.log('\nサンプル (enhanced_constraints):');
      console.log(JSON.stringify(constraints[0], null, 2));
    }
  }
  
  console.log('\n---\n');
  
  // business_rules
  const { data: businessRules, error: businessRulesError } = await supabase
    .from('business_rules')
    .select('*');
  
  if (businessRulesError) {
    console.error('business_rules取得エラー:', businessRulesError);
  } else {
    console.log(`business_rules: ${businessRules.length}件`);
    if (businessRules.length > 0) {
      console.log('\nサンプル (business_rules):');
      console.log(JSON.stringify(businessRules[0], null, 2));
    }
  }
  
  console.log('\n---\n');
  
  // unified_shift_rules
  const { data: unifiedRules, error: unifiedRulesError } = await supabase
    .from('unified_shift_rules')
    .select('*');
  
  if (unifiedRulesError) {
    console.error('unified_shift_rules取得エラー:', unifiedRulesError);
  } else {
    console.log(`unified_shift_rules: ${unifiedRules.length}件`);
    
    // タイプ別集計
    const byType = {};
    unifiedRules.forEach(rule => {
      byType[rule.rule_type] = (byType[rule.rule_type] || 0) + 1;
    });
    console.log('\nタイプ別:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}件`);
    });
  }
  
  console.log('\n=== データ分析完了 ===');
}

analyzeData().catch(console.error);
