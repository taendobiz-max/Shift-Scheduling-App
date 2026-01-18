const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set');
  process.exit(1);
}

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
      console.log('サンプル:', JSON.stringify(constraints[0], null, 2));
    }
  }
  
  console.log('\n');
  
  // business_rules
  const { data: businessRules, error: businessRulesError } = await supabase
    .from('business_rules')
    .select('*');
  
  if (businessRulesError) {
    console.error('business_rules取得エラー:', businessRulesError);
  } else {
    console.log(`business_rules: ${businessRules.length}件`);
    if (businessRules.length > 0) {
      console.log('サンプル:', JSON.stringify(businessRules[0], null, 2));
    }
  }
  
  console.log('\n');
  
  // unified_shift_rules
  const { data: unifiedRules, error: unifiedRulesError } = await supabase
    .from('unified_shift_rules')
    .select('*');
  
  if (unifiedRulesError) {
    console.error('unified_shift_rules取得エラー:', unifiedRulesError);
  } else {
    console.log(`unified_shift_rules: ${unifiedRules.length}件`);
  }
  
  console.log('\n=== データ分析完了 ===');
}

analyzeData().catch(console.error);
