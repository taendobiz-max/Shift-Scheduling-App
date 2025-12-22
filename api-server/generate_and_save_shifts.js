const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateAndSaveShifts() {
  console.log('🚀 Generating and saving shifts with multi-day businesses...\n');
  
  // Fetch employees
  console.log('📥 Fetching employees...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('office', '川越')
    .limit(20);
  
  if (empError) {
    console.error('❌ Error:', empError);
    return;
  }
  
  console.log(`  Found ${employees.length} employees`);
  
  // Fetch business masters
  console.log('📥 Fetching business masters...');
  const { data: businessMasters, error: bmError } = await supabase
    .from('business_master')
    .select('*')
    .or('営業所.eq.川越,業務タイプ.eq.multi_day');
  
  if (bmError) {
    console.error('❌ Error:', bmError);
    return;
  }
  
  console.log(`  Found ${businessMasters.length} business masters`);
  
  // Call generateShifts
  console.log('\n📞 Calling generateShifts...');
  const { generateShifts } = require('./shiftGenerator');
  
  const result = await generateShifts(
    employees,
    businessMasters,
    ['2025-12-16', '2025-12-17', '2025-12-18'],
    {},
    '川越'
  );
  
  console.log(`\n✅ Generation complete: ${result.shifts.length} shifts`);
  
  // Save to database
  console.log('\n💾 Saving shifts to database...');
  
  // Delete existing shifts for these dates
  const { error: deleteError } = await supabase
    .from('shifts')
    .delete()
    .in('date', ['2025-12-16', '2025-12-17', '2025-12-18'])
    .eq('location', '川越');
  
  if (deleteError) {
    console.error('❌ Error deleting old shifts:', deleteError);
    return;
  }
  
  // Insert new shifts
  const shiftsToInsert = result.shifts.map(s => ({
    employee_id: s.employee_id,
    employee_name: s.employee_name,
    business_master_id: s.business_master_id,
    business_name: s.business_name,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    location: s.location || '川越',
    multi_day_set_id: s.multi_day_set_id,
    multi_day_info: s.multi_day_info,
    created_at: new Date().toISOString()
  }));
  
  const { error: insertError } = await supabase
    .from('shifts')
    .insert(shiftsToInsert);
  
  if (insertError) {
    console.error('❌ Error inserting shifts:', insertError);
    return;
  }
  
  console.log(`✅ Saved ${shiftsToInsert.length} shifts to database`);
  
  // Verify multi-day shifts
  const multiDayShifts = shiftsToInsert.filter(s => s.multi_day_set_id);
  console.log(`\n🔍 Multi-day shifts saved: ${multiDayShifts.length}`);
  
  if (multiDayShifts.length > 0) {
    const sets = new Set(multiDayShifts.map(s => s.multi_day_set_id));
    console.log(`  Unique sets: ${sets.size}`);
    sets.forEach(setId => {
      const setShifts = multiDayShifts.filter(s => s.multi_day_set_id === setId);
      console.log(`\n  ${setId}:`);
      setShifts.forEach(s => {
        console.log(`    - ${s.date}: ${s.business_name} (${s.employee_name})`);
      });
    });
  }
  
  console.log('\n✅ Complete! You can now view the shifts in the UI.');
}

generateAndSaveShifts().catch(console.error);
