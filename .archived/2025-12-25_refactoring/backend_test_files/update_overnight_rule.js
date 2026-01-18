require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateRule() {
  const { data, error } = await supabase
    .from('business_rules')
    .update({ 営業所: '東京営業所' })
    .eq('rule_id', 'overnight_bus_rotation')
    .select();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('✅ Updated overnight_bus_rotation rule:');
  console.log('  営業所:', data[0].営業所);
}

updateRule();
