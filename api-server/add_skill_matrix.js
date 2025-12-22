const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addSkillMatrix() {
  console.log('📝 Adding skill matrix entries for multi-day businesses...\n');
  
  const businessGroup = 'ロジスティード東日本A';
  
  // Get sample employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('employee_id, name')
    .eq('office', '川越')
    .limit(5);
  
  if (empError) {
    console.error('❌ Error:', empError);
    return;
  }
  
  console.log(`Found ${employees.length} employees`);
  
  for (const emp of employees) {
    console.log(`\n  Processing ${emp.name} (${emp.employee_id})...`);
    
    // Check if skill already exists
    const { data: existing } = await supabase
      .from('skill_matrix')
      .select('id')
      .eq('employee_id', emp.employee_id)
      .eq('business_group', businessGroup)
      .single();
    
    if (existing) {
      console.log(`    ⏭️  Skill already exists`);
      continue;
    }
    
    // Insert new skill
    const { error: insertError } = await supabase
      .from('skill_matrix')
      .insert({
        employee_id: emp.employee_id,
        skill_name: businessGroup,
        business_group: businessGroup,
        skill_level: '○'
      });
    
    if (insertError) {
      console.error(`    ❌ Error:`, insertError);
    } else {
      console.log(`    ✅ Added skill "${businessGroup}"`);
    }
  }
  
  console.log('\n✅ Skill matrix update complete');
}

addSkillMatrix().catch(console.error);
