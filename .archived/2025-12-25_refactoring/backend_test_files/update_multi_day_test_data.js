const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateMultiDayBusinesses() {
  console.log('🔧 Updating multi-day business test data...\n');
  
  // Check existing employees and their teams
  console.log('📥 Checking employees...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('name, 班')
    .eq('office', '川越')
    .limit(10);
  
  if (empError) {
    console.error('❌ Error:', empError);
    return;
  }
  
  console.log(`Found ${employees.length} employees`);
  employees.forEach(e => console.log(`  ${e.name}: 班=${e.班 || 'null'}`));
  
  // Check existing business groups
  console.log('\n📥 Checking business groups...');
  const { data: businessGroups, error: bgError } = await supabase
    .from('business_master')
    .select('業務グループ')
    .eq('営業所', '川越')
    .limit(10);
  
  if (bgError) {
    console.error('❌ Error:', bgError);
    return;
  }
  
  const uniqueGroups = [...new Set(businessGroups.map(b => b.業務グループ).filter(g => g))];
  console.log('Unique business groups:', uniqueGroups);
  
  // Update multi-day businesses
  console.log('\n📝 Updating multi-day businesses...');
  
  // Use a common business group or create a generic one
  const businessGroup = uniqueGroups.length > 0 ? uniqueGroups[0] : '夜行バス';
  
  // Update Galaxy
  console.log(`  Updating Galaxy with business_group="${businessGroup}", 班指定=null`);
  const { error: galaxyError } = await supabase
    .from('business_master')
    .update({
      業務グループ: businessGroup,
      班指定: null  // Remove team filter for testing
    })
    .eq('業務id', 'STD_GALAXY_SET');
  
  if (galaxyError) {
    console.error('❌ Error updating Galaxy:', galaxyError);
  } else {
    console.log('  ✅ Galaxy updated');
  }
  
  // Update Aube
  console.log(`  Updating Aube with business_group="${businessGroup}", 班指定=null`);
  const { error: aubeError } = await supabase
    .from('business_master')
    .update({
      業務グループ: businessGroup,
      班指定: null  // Remove team filter for testing
    })
    .eq('業務id', 'STD_AUBE_SET');
  
  if (aubeError) {
    console.error('❌ Error updating Aube:', aubeError);
  } else {
    console.log('  ✅ Aube updated');
  }
  
  // Verify
  console.log('\n🔍 Verifying updates...');
  const { data: verified, error: verifyError } = await supabase
    .from('business_master')
    .select('業務id, 業務名, 業務グループ, 班指定, 方向')
    .in('業務id', ['STD_GALAXY_SET', 'STD_AUBE_SET']);
  
  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
  } else {
    console.log('✅ Verified:');
    console.log(JSON.stringify(verified, null, 2));
  }
  
  // Add skill matrix entries for testing
  console.log('\n📝 Adding skill matrix entries...');
  const { data: sampleEmployees } = await supabase
    .from('employees')
    .select('employee_id')
    .eq('office', '川越')
    .limit(5);
  
  if (sampleEmployees && sampleEmployees.length > 0) {
    for (const emp of sampleEmployees) {
      const { error: skillError } = await supabase
        .from('skill_matrix')
        .upsert({
          employee_id: emp.employee_id,
          skill_name: businessGroup,
          has_skill: true
        }, {
          onConflict: 'employee_id,skill_name'
        });
      
      if (skillError) {
        console.error(`  ❌ Error adding skill for ${emp.employee_id}:`, skillError);
      } else {
        console.log(`  ✅ Added skill "${businessGroup}" for ${emp.employee_id}`);
      }
    }
  }
  
  console.log('\n✅ Update complete');
}

updateMultiDayBusinesses().catch(console.error);
