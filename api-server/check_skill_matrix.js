const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://oazeiobncwkgbjrfqswu.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hemVpb2JuY3drZ2JqcmZxc3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0NzQxMDIsImV4cCI6MjA0NzA1MDEwMn0.XeZPYHwQhcJdpjUwLDxhMkq7EYxDhLHFVcPVcPCWTqY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSkillMatrix() {
  console.log('🔍 Checking skill_matrix table...');
  
  // Check for employee 00001001
  const { data, error } = await supabase
    .from('skill_matrix')
    .select('*')
    .eq('employee_id', '00001001');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📊 Skill matrix for employee 00001001:');
  console.log(JSON.stringify(data, null, 2));
  
  // Check all records
  const { data: allData, error: allError } = await supabase
    .from('skill_matrix')
    .select('employee_id, business_group, skill_level')
    .limit(10);
  
  if (allError) {
    console.error('❌ Error:', allError);
    return;
  }
  
  console.log('\n📊 All skill_matrix records (first 10):');
  console.log(JSON.stringify(allData, null, 2));
  
  // Count total records
  const { count, error: countError } = await supabase
    .from('skill_matrix')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error:', countError);
    return;
  }
  
  console.log('\n📊 Total records in skill_matrix:', count);
}

checkSkillMatrix();
