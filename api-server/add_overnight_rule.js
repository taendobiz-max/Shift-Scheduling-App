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

async function addOvernightBusRule() {
  const rule = {
    rule_name: '夜行バスの排他制御',
    rule_category: '法令遵守',
    description: '夜行バス（拘束時間12時間以上または特定キーワードを含む業務）が割り当てられた日は、他の業務を割り当てない。拘束時間が長くなりすぎるため。',
    applicable_locations: ['東京', '川越', '川口'],
    applicable_business_groups: null,
    applicable_employees: null,
    rule_type: 'constraint',
    rule_config: {
      constraint_type: 'overnight_bus_exclusion',
      overnight_keywords: ['STD', '夜行', 'ナイト'],
      min_duration_hours: 12,
      enforcement: 'strict'
    },
    priority_level: 1,
    enforcement_level: 'mandatory',
    is_active: true
  };

  console.log('Adding overnight bus rule...');
  console.log(JSON.stringify(rule, null, 2));

  const { data, error } = await supabase
    .from('unified_shift_rules')
    .insert([rule])
    .select();

  if (error) {
    console.error('❌ Error adding rule:', error);
    return;
  }

  console.log('✅ Successfully added overnight bus rule:');
  console.log(JSON.stringify(data, null, 2));
}

addOvernightBusRule();
