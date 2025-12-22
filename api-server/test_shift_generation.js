const { createClient } = require('@supabase/supabase-js');
const { generateShifts } = require('./shiftGenerator');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testShiftGeneration() {
  console.log('Fetching employees...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*');
  
  if (empError) {
    console.error('Error fetching employees:', empError);
    return;
  }
  
  console.log('Fetching business masters...');
  const { data: businessMasters, error: bizError } = await supabase
    .from('business_master')
    .select('*')
    .eq('営業所', '川越');
  
  if (bizError) {
    console.error('Error fetching business masters:', bizError);
    return;
  }
  
  console.log('Found ' + employees.length + ' employees and ' + businessMasters.length + ' business masters');
  
  console.log('\nGenerating shifts for 2025-12-15 and 2025-12-16...');
  const result = await generateShifts(
    employees,
    businessMasters,
    ['2025-12-15', '2025-12-16'],
    {},
    '川越'
  );
  
  console.log('\nResult:', {
    success: result.success,
    shifts: result.shifts.length,
    violations: result.violations.length
  });
}

testShiftGeneration();
