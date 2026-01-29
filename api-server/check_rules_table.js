const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env file
const envPath = '/home/ec2-user/shift-app/api-server/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
let supabaseUrl, supabaseKey;

envLines.forEach(line => {
  if (line.startsWith('SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  } else if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRulesTable() {
  // Get table structure
  const { data: rules, error } = await supabase
    .from('unified_shift_rules')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('unified_shift_rules テーブルのサンプルデータ:');
  console.log(JSON.stringify(rules, null, 2));
  
  if (rules && rules.length > 0) {
    console.log('\nテーブルのカラム:');
    console.log(Object.keys(rules[0]));
  }
}

checkRulesTable();
