require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRules() {
  const { data, error } = await supabase
    .from('business_rules')
    .select('*')
    .order('priority', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Total rules:', data.length);
  if (data.length > 0) {
    console.log('\nColumns:', Object.keys(data[0]));
  }
  console.log('\nRules:');
  data.forEach(rule => {
    console.log(`  - [${rule.rule_id}] ${rule.rule_name} (type: ${rule.rule_type}, active: ${rule.is_active}, priority: ${rule.priority})`);
  });
}

checkRules();
