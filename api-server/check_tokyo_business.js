const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTokyo() {
  const { data, error } = await supabase
    .from('business_master')
    .select('業務id, 業務名, 営業所')
    .eq('営業所', '東京');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Found', data.length, 'business masters for 東京');
    data.forEach(b => {
      console.log('  -', b.業務id, b.業務名);
    });
  }
}

checkTokyo();
