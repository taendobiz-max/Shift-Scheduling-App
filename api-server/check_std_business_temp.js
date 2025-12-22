const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSTD() {
  const { data, error } = await supabase
    .from('business_master')
    .select('*')
    .ilike('業務名', '%STD%')
    .order('業務名');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('STD Business Masters:');
    data.forEach(b => {
      console.log('---');
      console.log('Keys:', Object.keys(b));
      console.log('業務名:', b.業務名);
      console.log('方向:', b.方向);
      console.log('業務タイプ:', b.業務タイプ);
    });
  }
}

checkSTD();
