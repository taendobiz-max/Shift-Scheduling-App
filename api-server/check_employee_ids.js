const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEmployeeIds() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_id, name')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample employees:');
    data.forEach(e => {
      console.log('id:', e.id, 'employee_id:', e.employee_id, 'name:', e.name);
    });
  }
}

checkEmployeeIds();
