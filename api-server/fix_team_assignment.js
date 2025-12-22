const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTeamAssignment() {
  console.log('🔧 Fixing team assignments in business_master...\n');
  
  // Update Galaxy set
  const { error: galaxyError } = await supabase
    .from('business_master')
    .update({ 班指定: 'Galaxy' })
    .eq('業務id', 'STD_GALAXY_SET');
  
  if (galaxyError) {
    console.error('❌ Error updating Galaxy:', galaxyError);
    return;
  }
  
  console.log('✅ Updated STD_GALAXY_SET → 班指定: Galaxy');
  
  // Update Aube set
  const { error: aubeError } = await supabase
    .from('business_master')
    .update({ 班指定: 'Aube' })
    .eq('業務id', 'STD_AUBE_SET');
  
  if (aubeError) {
    console.error('❌ Error updating Aube:', aubeError);
    return;
  }
  
  console.log('✅ Updated STD_AUBE_SET → 班指定: Aube');
  
  // Verify
  console.log('\n🔍 Verifying updates...');
  const { data, error } = await supabase
    .from('business_master')
    .select('業務id, 業務名, 班指定, 方向')
    .in('業務id', ['STD_GALAXY_SET', 'STD_AUBE_SET']);
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    data.forEach(b => {
      console.log(`  ${b.業務id}: 班指定=${b.班指定}, 方向=${b.方向}`);
    });
  }
  
  console.log('\n✅ Complete!');
}

fixTeamAssignment().catch(console.error);
