const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateDecemberShifts() {
  console.log('🚀 Generating shifts for December 1-9, 2025...\n');
  
  // Fetch employees
  console.log('📥 Fetching employees...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .order('display_order');
  
  if (empError) {
    console.error('❌ Error:', empError);
    return;
  }
  
  console.log(`  Found ${employees.length} employees`);
  
  // Fetch business masters
  console.log('📥 Fetching business masters...');
  const { data: businessMasters, error: bmError } = await supabase
    .from('business_master')
    .select('*');
  
  if (bmError) {
    console.error('❌ Error:', bmError);
    return;
  }
  
  console.log(`  Found ${businessMasters.length} business masters`);
  
  // Generate date range
  const dates = [];
  for (let day = 1; day <= 9; day++) {
    dates.push(`2025-12-${day.toString().padStart(2, '0')}`);
  }
  
  console.log(`  Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
  
  // Call generateShifts
  console.log('\n📞 Calling generateShifts...');
  const { generateShifts } = require('./shiftGenerator');
  
  const result = await generateShifts(
    employees,
    businessMasters,
    dates,
    {},
    'all'  // All locations
  );
  
  console.log(`\n✅ Generation complete: ${result.shifts.length} shifts`);
  
  // Count multi-day shifts
  const multiDayShifts = result.shifts.filter(s => s.multi_day_set_id);
  console.log(`  Multi-day shifts: ${multiDayShifts.length}`);
  
  if (multiDayShifts.length > 0) {
    const sets = new Set(multiDayShifts.map(s => s.multi_day_set_id));
    console.log(`  Unique multi-day sets: ${sets.size}`);
  }
  
  // Save to database
  console.log('\n💾 Saving shifts to database...');
  
  // Delete existing shifts for these dates
  const { error: deleteError } = await supabase
    .from('shifts')
    .delete()
    .in('date', dates);
  
  if (deleteError) {
    console.error('❌ Error deleting old shifts:', deleteError);
    return;
  }
  
  console.log('  Deleted old shifts');
  
  // Insert new shifts
  const shiftsToInsert = result.shifts.map(s => ({
    employee_id: s.employee_id,
    business_master_id: s.business_master_id,
    business_name: s.business_name,
    date: s.date,
    location: s.location,
    multi_day_set_id: s.multi_day_set_id || null,
    multi_day_info: s.multi_day_info || null,
    created_at: new Date().toISOString()
  }));
  
  // Insert in batches to avoid payload size limits
  const batchSize = 500;
  for (let i = 0; i < shiftsToInsert.length; i += batchSize) {
    const batch = shiftsToInsert.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('shifts')
      .insert(batch);
    
    if (insertError) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError);
      return;
    }
    
    console.log(`  Inserted batch ${i / batchSize + 1} (${batch.length} shifts)`);
  }
  
  console.log(`\n✅ Saved ${shiftsToInsert.length} shifts to database`);
  
  // Verify multi-day shifts in database
  if (multiDayShifts.length > 0) {
    console.log('\n🔍 Verifying multi-day shifts in database...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('shifts')
      .select('*')
      .not('multi_day_set_id', 'is', null)
      .in('date', dates);
    
    if (verifyError) {
      console.error('❌ Error:', verifyError);
    } else {
      console.log(`  Found ${verifyData.length} multi-day shifts in database`);
      
      if (verifyData.length > 0) {
        const sets = new Set(verifyData.map(s => s.multi_day_set_id));
        console.log(`  Unique sets: ${sets.size}`);
        
        // Show first set as example
        const firstSetId = Array.from(sets)[0];
        const firstSet = verifyData.filter(s => s.multi_day_set_id === firstSetId);
        console.log(`\n  Example set: ${firstSetId}`);
        firstSet.forEach(s => {
          console.log(`    - ${s.date}: ${s.business_name} (Day ${s.multi_day_info?.day}/${s.multi_day_info?.total_days})`);
        });
      }
    }
  }
  
  console.log('\n✅ Complete! Shifts are ready for UI display.');
}

generateDecemberShifts().catch(console.error);
