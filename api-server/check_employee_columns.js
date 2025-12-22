const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkEmployeeColumns() {
  console.log('🔍 Checking employee table structure\n');
  
  // Fetch one employee to see column names
  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (employees && employees.length > 0) {
    console.log('📋 Column names in employees table:');
    console.log(Object.keys(employees[0]));
    console.log('\n📊 Sample employee data:');
    console.log(JSON.stringify(employees[0], null, 2));
  }
}

checkEmployeeColumns().catch(console.error);
