const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSTD() {
  const { data, error } = await supabase
    .from('business_master')
    .select('業務名, 業務グループ')
    .ilike('業務名', '%STD%');
  
  if (error) {
    console.error('Error:', error);
  } else {
    data.forEach(b => {
      console.log('業務名:', b.業務名, '業務グループ:', b.業務グループ);
    });
  }
}

checkSTD();
