const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOfficeLocation() {
  console.log('🔧 Fixing office location in business_master...\n');
  
  // Update both businesses
  const { error } = await supabase
    .from('business_master')
    .update({ 営業所: '東京' })
    .in('業務id', ['STD_GALAXY_SET', 'STD_AUBE_SET']);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('✅ Updated office location to 東京');
  
  // Verify
  console.log('\n🔍 Verifying updates...');
  const { data, error: verifyError } = await supabase
    .from('business_master')
    .select('業務id, 業務名, 営業所, 班指定')
    .in('業務id', ['STD_GALAXY_SET', 'STD_AUBE_SET']);
  
  if (verifyError) {
    console.error('❌ Error:', verifyError);
  } else {
    data.forEach(b => {
      console.log(`  ${b.業務id}:`);
      console.log(`    営業所: ${b.営業所}`);
      console.log(`    班指定: ${b.班指定}`);
    });
  }
  
  console.log('\n✅ Complete!');
}

fixOfficeLocation().catch(console.error);
