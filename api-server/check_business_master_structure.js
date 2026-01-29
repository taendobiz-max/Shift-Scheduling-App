const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env file
const envPath = '/home/ec2-user/shift-app/api-server/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
let supabaseUrl, supabaseKey;

envLines.forEach(line => {
  if (line.startsWith('SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  } else if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBusinessMasterStructure() {
  // Get sample data to see structure
  const { data, error } = await supabase
    .from('business_master')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('business_master テーブルのサンプルデータ:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data && data.length > 0) {
    console.log('\nテーブルのカラム:');
    console.log(Object.keys(data[0]));
  }
  
  // Check for overnight bus types
  console.log('\n夜行バス関連の業務を検索:');
  const { data: overnightData, error: overnightError } = await supabase
    .from('business_master')
    .select('*')
    .or('business_type.eq.夜行バス（往路）,business_type.eq.夜行バス（復路）');
  
  if (overnightError) {
    console.error('Error searching overnight buses:', overnightError);
  } else {
    console.log(`Found ${overnightData?.length || 0} overnight bus entries`);
    if (overnightData && overnightData.length > 0) {
      console.log('Sample overnight bus:');
      console.log(JSON.stringify(overnightData[0], null, 2));
    }
  }
}

checkBusinessMasterStructure();
