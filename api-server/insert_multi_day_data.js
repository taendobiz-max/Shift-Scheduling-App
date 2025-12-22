const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertMultiDayBusinesses() {
  console.log('🔍 Checking existing multi-day businesses...');
  
  // Check if they already exist
  const { data: existing, error: checkError } = await supabase
    .from('business_master')
    .select('業務ID, 業務名, 営業所')
    .in('業務ID', ['STD_GALAXY_SET', 'STD_AUBE_SET']);
  
  if (checkError) {
    console.error('❌ Error checking existing data:', checkError);
    return;
  }
  
  console.log('Existing records:', existing);
  
  // Insert or update STD_GALAXY_SET
  console.log('\n📝 Inserting STD_GALAXY_SET...');
  const { data: galaxy, error: galaxyError } = await supabase
    .from('business_master')
    .upsert({
      業務ID: 'STD_GALAXY_SET',
      業務名: '夜行バス_ギャラクシー号セット',
      営業所: 'STD',
      開始時刻: '19:00',
      終了時刻: '09:00',
      必要人数: 1,
      優先度: 100,
      is_multi_day: true,
      multi_day_duration: 2,
      multi_day_start_condition: { type: 'day_parity', value: 'even' }
    }, {
      onConflict: '業務ID'
    });
  
  if (galaxyError) {
    console.error('❌ Error inserting Galaxy:', galaxyError);
  } else {
    console.log('✅ Galaxy inserted/updated');
  }
  
  // Insert or update STD_AUBE_SET
  console.log('\n📝 Inserting STD_AUBE_SET...');
  const { data: aube, error: aubeError } = await supabase
    .from('business_master')
    .upsert({
      業務ID: 'STD_AUBE_SET',
      業務名: '夜行バス_オーブ号セット',
      営業所: 'STD',
      開始時刻: '19:00',
      終了時刻: '09:00',
      必要人数: 1,
      優先度: 100,
      is_multi_day: true,
      multi_day_duration: 2,
      multi_day_start_condition: { type: 'day_parity', value: 'odd' }
    }, {
      onConflict: '業務ID'
    });
  
  if (aubeError) {
    console.error('❌ Error inserting Aube:', aubeError);
  } else {
    console.log('✅ Aube inserted/updated');
  }
  
  // Verify the inserts
  console.log('\n🔍 Verifying inserts...');
  const { data: verified, error: verifyError } = await supabase
    .from('business_master')
    .select('業務ID, 業務名, 営業所, is_multi_day, multi_day_duration, multi_day_start_condition')
    .in('業務ID', ['STD_GALAXY_SET', 'STD_AUBE_SET']);
  
  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
  } else {
    console.log('✅ Verified records:');
    console.log(JSON.stringify(verified, null, 2));
  }
}

insertMultiDayBusinesses().catch(console.error);
