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
    .ilike('業務名', '%STD%');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Found', data.length, 'STD business masters');
    data.forEach(b => {
      console.log('---');
      console.log('業務ID:', b.業務id);
      console.log('業務名:', b.業務名);
      console.log('営業所:', b.営業所);
      console.log('方向:', b.方向);
      console.log('業務タイプ:', b.業務タイプ);
    });
  }
}

checkSTD();
