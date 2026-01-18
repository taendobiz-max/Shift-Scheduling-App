const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSTDSkills() {
  const { data, error } = await supabase
    .from('skill_matrix')
    .select('employee_id, business_group')
    .eq('business_group', 'STD便');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Found', data.length, 'employees with STD便 skill');
    console.log('Employee IDs:', data.map(d => d.employee_id));
  }
}

checkSTDSkills();
