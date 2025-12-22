const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateSTDPair() {
  console.log('Updating STD便 pair IDs to null...');
  const { data, error } = await supabase
    .from('business_master')
    .update({ ペア業務id: null })
    .in('業務id', ['STD_OUT', 'STD_RET']);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Successfully updated STD便 pair IDs');
  }
  
  // Verify
  const { data: updated, error: verifyError } = await supabase
    .from('business_master')
    .select('業務id, 業務名, ペア業務id')
    .in('業務id', ['STD_OUT', 'STD_RET']);
  
  if (verifyError) {
    console.error('Verify error:', verifyError);
  } else {
    console.log('Updated records:');
    updated.forEach(b => {
      console.log('  業務id:', b.業務id, 'ペア業務id:', b.ペア業務id);
    });
  }
}

updateSTDPair();
