const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('business_master')
    .select('業務id, 業務名, 業務グループ, 営業所')
    .in('業務id', ['STD_GALAXY_SET', 'STD_AUBE_SET']);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Business details:');
    data.forEach(b => {
      console.log(`  ${b.業務id}:`);
      console.log(`    業務名: ${b.業務名}`);
      console.log(`    業務グループ: ${b.業務グループ || 'なし'}`);
      console.log(`    営業所: ${b.営業所 || 'なし'}`);
    });
    
    // Check if there are employees with matching business_group
    if (data[0]?.業務グループ) {
      console.log(`\n🔍 Checking employees with business_group: ${data[0].業務グループ}`);
      const { data: skills, error: skillError } = await supabase
        .from('skill_matrix')
        .select('employee_id, business_group')
        .eq('business_group', data[0].業務グループ);
      
      if (skillError) {
        console.error('Skill error:', skillError);
      } else {
        console.log(`  Found ${skills.length} employees with this business_group`);
      }
    }
  }
})();
