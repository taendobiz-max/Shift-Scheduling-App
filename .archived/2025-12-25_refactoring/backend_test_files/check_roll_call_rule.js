require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRule() {
  const { data, error } = await supabase
    .from('business_rules')
    .select('*')
    .eq('rule_id', 'roll_call_filter')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('点呼業務フィルタルール:');
  console.log('  rule_id:', data.rule_id);
  console.log('  rule_name:', data.rule_name);
  console.log('  enabled:', data.enabled);
  console.log('  営業所:', data.営業所);
  console.log('  priority:', data.priority);
  console.log('  conditions:', JSON.stringify(data.conditions, null, 2));
  console.log('  actions:', JSON.stringify(data.actions, null, 2));
}

checkRule();
