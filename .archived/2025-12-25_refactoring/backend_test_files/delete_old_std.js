const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteOldSTD() {
  console.log('Deleting old STD business masters...');
  const { data, error } = await supabase
    .from('business_master')
    .delete()
    .in('業務id', ['TN_STD01A', 'TN_STD01B']);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Successfully deleted old STD business masters');
  }
  
  // Verify
  const { data: remaining, error: verifyError } = await supabase
    .from('business_master')
    .select('業務id, 業務名')
    .ilike('業務名', '%STD%');
  
  if (verifyError) {
    console.error('Verify error:', verifyError);
  } else {
    console.log('Remaining STD business masters:', remaining.length);
    remaining.forEach(b => {
      console.log('  -', b.業務id, b.業務名);
    });
  }
}

deleteOldSTD();
