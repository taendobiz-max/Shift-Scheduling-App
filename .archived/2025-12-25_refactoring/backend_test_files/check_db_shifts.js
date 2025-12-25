const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkShifts() {
  console.log('Checking shifts with multi-day information...\n');
  
  // Get recent shifts with 東京仙台 in the name
  // Get the most recent shifts
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('*')
    .gte('date', '2025-11-15')
    .order('date', { ascending: true })
    .limit(50);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!shifts || shifts.length === 0) {
    console.log('No shifts found after 2025-11-15');
    return;
  }
  
  console.log(`Found ${shifts.length} shifts after 2025-11-15:\n`);
  
  shifts.forEach(shift => {
    console.log(`Date: ${shift.date}`);
    console.log(`  Employee: ${shift.employee_name} (${shift.employee_id})`);
    console.log(`  Business: ${shift.business_name}`);
    console.log(`  multi_day_set_id: ${shift.multi_day_set_id || 'NULL'}`);
    console.log(`  multi_day_info: ${shift.multi_day_info ? JSON.stringify(shift.multi_day_info) : 'NULL'}`);
    console.log('');
  });
}

checkShifts().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
