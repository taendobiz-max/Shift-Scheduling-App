const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .in('date', ['2025-12-15', '2025-12-16'])
    .order('date')
    .order('business_name');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Found', data.length, 'shifts');
    const stdShifts = data.filter(s => s.business_name && s.business_name.includes('STD'));
    console.log('\nSTD shifts:', stdShifts.length);
    stdShifts.forEach(s => {
      console.log(s.date, s.business_name, s.employee_id);
    });
  }
}

checkShifts();
