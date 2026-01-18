const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  // Try employees table
  console.log('Checking employees table...');
  const { data: empData, error: empError } = await supabase
    .from('employees')
    .select('*')
    .limit(1);
  
  if (!empError && empData) {
    console.log('employees table columns:', Object.keys(empData[0] || {}));
  }
  
  // Try employee_master table
  console.log('\nChecking employee_master table...');
  const { data: masterData, error: masterError } = await supabase
    .from('employee_master')
    .select('*')
    .limit(1);
  
  if (!masterError && masterData) {
    console.log('employee_master table columns:', Object.keys(masterData[0] || {}));
  } else {
    console.log('employee_master error:', masterError);
  }
}

checkTable();
