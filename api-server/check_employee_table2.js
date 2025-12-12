const { supabase } = require('./supabaseClient');

async function checkTable() {
  // Try employees table
  console.log('Checking employees table...');
  const { data: empData, error: empError } = await supabase
    .from('employees')
    .select('*')
    .limit(1);
  
  if (!empError && empData && empData.length > 0) {
    console.log('employees table columns:', Object.keys(empData[0]));
  } else {
    console.log('employees error or no data:', empError);
  }
  
  // Try employee_master table
  console.log('\nChecking employee_master table...');
  const { data: masterData, error: masterError } = await supabase
    .from('employee_master')
    .select('*')
    .limit(1);
  
  if (!masterError && masterData && masterData.length > 0) {
    console.log('employee_master table columns:', Object.keys(masterData[0]));
  } else {
    console.log('employee_master error or no data:', masterError);
  }
}

checkTable();
