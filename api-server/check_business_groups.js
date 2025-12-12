require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkBusinessGroups() {
  console.log('🔍 Checking business_groups table...\n');
  
  const { data, error } = await supabase
    .from('business_groups')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`✅ Found ${data.length} business groups:\n`);
  console.log(JSON.stringify(data, null, 2));
}

checkBusinessGroups();
