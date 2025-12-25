const { createClient } = require('@supabase/supabase-js');
const { generateShifts } = require('./dist/shiftGenerator');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const { data: employees } = await supabase.from('employees').select('*').eq('office', '東京').limit(10);
  const { data: businesses } = await supabase.from('business_master').select('*').eq('location', '東京');
  
  console.log('📊 Employees:', employees.length);
  console.log('📊 Businesses:', businesses.length);
  console.log('📊 Multi-day:', businesses.filter(b => b.運行日数 === 2).length);
  
  const result = await generateShifts(employees, businesses, ['2025-12-01', '2025-12-02'], {}, '東京');
  
  console.log('📊 Total shifts:', result.shifts.length);
  console.log('📊 Multi-day shifts:', result.shifts.filter(s => s.multi_day_set_id).length);
  console.log('📊 Sample:', result.shifts.filter(s => s.multi_day_set_id)[0]);
}

test().catch(console.error);
