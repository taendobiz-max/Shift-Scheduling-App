const { createClient } = require('@supabase/supabase-js');
const { generateShifts } = require('./shiftGenerator');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function regenerateShifts() {
  console.log('Step 1: Deleting existing shifts...');
  const { error: deleteError } = await supabase
    .from('shifts')
    .delete()
    .in('date', ['2025-12-15', '2025-12-16']);
  
  if (deleteError) {
    console.error('Delete error:', deleteError);
    return;
  }
  console.log('✓ Deleted existing shifts');
  
  console.log('\nStep 2: Fetching employees and business masters...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*');
  
  if (empError) {
    console.error('Employee error:', empError);
    return;
  }
  
  const { data: businessMasters, error: bizError } = await supabase
    .from('business_master')
    .select('*')
    .eq('営業所', '東京');
  
  if (bizError) {
    console.error('Business error:', bizError);
    return;
  }
  
  console.log('Found ' + employees.length + ' employees and ' + businessMasters.length + ' business masters');
  
  console.log('\nStep 3: Generating shifts...');
  const result = await generateShifts(
    employees,
    businessMasters,
    ['2025-12-15', '2025-12-16'],
    {},
    '東京'
  );
  
  console.log('\n=== RESULT ===');
  console.log('Success:', result.success);
  console.log('Total shifts:', result.shifts.length);
  console.log('Violations:', result.violations.length);
  
  // Check STD shifts
  const stdShifts = result.shifts.filter(s => s.business_name && s.business_name.includes('STD'));
  console.log('\n=== STD SHIFTS ===');
  console.log('Total:', stdShifts.length);
  stdShifts.forEach(s => {
    console.log(s.date, s.business_name, s.employee_id);
  });
}

regenerateShifts();
