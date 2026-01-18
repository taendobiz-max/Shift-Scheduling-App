const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSTDPair() {
  const { data, error } = await supabase
    .from('business_master')
    .select('業務id, 業務名, ペア業務id')
    .in('業務id', ['STD_OUT', 'STD_RET']);
  
  if (error) {
    console.error('Error:', error);
  } else {
    data.forEach(b => {
      console.log('業務id:', b.業務id, '業務名:', b.業務名, 'ペア業務id:', b.ペア業務id);
    });
  }
}

checkSTDPair();
