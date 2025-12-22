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
    .select('業務id, 業務名, 営業所')
    .in('業務id', ['STD_GALAXY_SET', 'STD_AUBE_SET']);
  
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
      業務id: 'STD_GALAXY_SET',
      業務名: '夜行バス_ギャラクシー号セット',
      営業所: 'STD',
      開始時間: '19:00',
      終了時間: '09:00',
      required_staff_count: 1,
      業務タイプ: 'multi_day',
      運行日数: 2,
      班ローテーション: true,
      班指定: 'Galaxy',
      方向: 'even'
    }, {
      onConflict: '業務id'
    })
    .select();
  
  if (galaxyError) {
    console.error('❌ Error inserting Galaxy:', galaxyError);
  } else {
    console.log('✅ Galaxy inserted/updated:', galaxy);
  }
  
  // Insert or update STD_AUBE_SET
  console.log('\n📝 Inserting STD_AUBE_SET...');
  const { data: aube, error: aubeError } = await supabase
    .from('business_master')
    .upsert({
      業務id: 'STD_AUBE_SET',
      業務名: '夜行バス_オーブ号セット',
      営業所: 'STD',
      開始時間: '19:00',
      終了時間: '09:00',
      required_staff_count: 1,
      業務タイプ: 'multi_day',
      運行日数: 2,
      班ローテーション: true,
      班指定: 'Aube',
      方向: 'odd'
    }, {
      onConflict: '業務id'
    })
    .select();
  
  if (aubeError) {
    console.error('❌ Error inserting Aube:', aubeError);
  } else {
    console.log('✅ Aube inserted/updated:', aube);
  }
  
  // Verify the inserts
  console.log('\n🔍 Verifying inserts...');
  const { data: verified, error: verifyError } = await supabase
    .from('business_master')
    .select('業務id, 業務名, 営業所, 業務タイプ, 運行日数, 班ローテーション, 班指定, 方向')
    .in('業務id', ['STD_GALAXY_SET', 'STD_AUBE_SET']);
  
  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
  } else {
    console.log('✅ Verified records:');
    console.log(JSON.stringify(verified, null, 2));
  }
}

insertMultiDayBusinesses().catch(console.error);
