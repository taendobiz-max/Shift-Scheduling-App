const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDataIntegrity() {
  console.log('=== データ整合性確認開始 ===\n');
  
  // enhanced_constraints取得
  const { data: constraints, error: constraintsError } = await supabase
    .from('enhanced_constraints')
    .select('*')
    .order('constraint_name');
  
  if (constraintsError) {
    console.error('enhanced_constraints取得エラー:', constraintsError);
    return;
  }
  
  // unified_shift_rules（constraint）取得
  const { data: unifiedConstraints, error: unifiedConstraintsError } = await supabase
    .from('unified_shift_rules')
    .select('*')
    .eq('rule_type', 'constraint')
    .order('rule_name');
  
  if (unifiedConstraintsError) {
    console.error('unified_shift_rules取得エラー:', unifiedConstraintsError);
    return;
  }
  
  console.log('### 制約条件の比較 ###\n');
  console.log(`enhanced_constraints: ${constraints.length}件`);
  console.log(`unified_shift_rules (constraint): ${unifiedConstraints.length}件\n`);
  
  // 名前の比較
  const constraintNames = constraints.map(c => c.constraint_name).sort();
  const unifiedNames = unifiedConstraints.map(c => c.rule_name).sort();
  
  console.log('enhanced_constraintsの制約名:');
  constraintNames.forEach(name => console.log(`  - ${name}`));
  
  console.log('\nunified_shift_rulesの制約名:');
  unifiedNames.forEach(name => console.log(`  - ${name}`));
  
  // 差分確認
  const missingInUnified = constraintNames.filter(name => !unifiedNames.includes(name));
  const extraInUnified = unifiedNames.filter(name => !constraintNames.includes(name));
  
  console.log('\n### 差分分析 ###\n');
  
  if (missingInUnified.length > 0) {
    console.log('⚠️  unified_shift_rulesに存在しない制約:');
    missingInUnified.forEach(name => console.log(`  - ${name}`));
  } else {
    console.log('✅ すべての制約がunified_shift_rulesに存在');
  }
  
  if (extraInUnified.length > 0) {
    console.log('\n⚠️  enhanced_constraintsに存在しない制約:');
    extraInUnified.forEach(name => console.log(`  - ${name}`));
  }
  
  console.log('\n---\n');
  
  // business_rules取得
  const { data: businessRules, error: businessRulesError } = await supabase
    .from('business_rules')
    .select('*')
    .order('rule_name');
  
  if (businessRulesError) {
    console.error('business_rules取得エラー:', businessRulesError);
    return;
  }
  
  // unified_shift_rules（filter, assignment, business_logic）取得
  const { data: unifiedBusinessRules, error: unifiedBusinessRulesError } = await supabase
    .from('unified_shift_rules')
    .select('*')
    .in('rule_type', ['filter', 'assignment', 'business_logic'])
    .order('rule_name');
  
  if (unifiedBusinessRulesError) {
    console.error('unified_shift_rules取得エラー:', unifiedBusinessRulesError);
    return;
  }
  
  console.log('### ビジネスルールの比較 ###\n');
  console.log(`business_rules: ${businessRules.length}件`);
  console.log(`unified_shift_rules (filter/assignment/business_logic): ${unifiedBusinessRules.length}件\n`);
  
  // 名前の比較
  const businessRuleNames = businessRules.map(r => r.rule_name).sort();
  const unifiedBusinessNames = unifiedBusinessRules.map(r => r.rule_name).sort();
  
  console.log('business_rulesのルール名:');
  businessRuleNames.forEach(name => console.log(`  - ${name}`));
  
  console.log('\nunified_shift_rulesのルール名:');
  unifiedBusinessNames.forEach(name => console.log(`  - ${name}`));
  
  // 差分確認
  const missingBusinessInUnified = businessRuleNames.filter(name => !unifiedBusinessNames.includes(name));
  const extraBusinessInUnified = unifiedBusinessNames.filter(name => !businessRuleNames.includes(name));
  
  console.log('\n### 差分分析 ###\n');
  
  if (missingBusinessInUnified.length > 0) {
    console.log('⚠️  unified_shift_rulesに存在しないビジネスルール:');
    missingBusinessInUnified.forEach(name => console.log(`  - ${name}`));
    console.log(`\n→ ${missingBusinessInUnified.length}件のビジネスルールを移行する必要があります`);
  } else {
    console.log('✅ すべてのビジネスルールがunified_shift_rulesに存在');
  }
  
  if (extraBusinessInUnified.length > 0) {
    console.log('\n⚠️  business_rulesに存在しないルール:');
    extraBusinessInUnified.forEach(name => console.log(`  - ${name}`));
  }
  
  console.log('\n=== データ整合性確認完了 ===');
}

checkDataIntegrity().catch(console.error);
