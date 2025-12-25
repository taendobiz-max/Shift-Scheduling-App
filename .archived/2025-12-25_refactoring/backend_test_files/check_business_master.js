const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oazeiobncwkgbjrfqswu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hemVpb2JuY3drZ2JqcmZxc3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0NzQxMDIsImV4cCI6MjA0NzA1MDEwMn0.XeZPYHwQhcJdpjUwLDxhMkq7EYxDhLHFVcPVcPCWTqY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBusinessMaster() {
  console.log('🔍 Checking business master data...');
  
  const { data, error } = await supabase
    .from('business_master')
    .select('*')
    .eq('業務名', '奈良便(往路)');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📊 Business master data:');
  console.log(JSON.stringify(data, null, 2));
  
  // Check all business masters
  const { data: allData, error: allError } = await supabase
    .from('business_master')
    .select('業務id, 業務名, 業務グループ');
  
  if (allError) {
    console.error('❌ Error:', allError);
    return;
  }
  
  console.log('\n📊 All business masters:');
  console.log(JSON.stringify(allData, null, 2));
}

checkBusinessMaster();
