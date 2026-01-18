const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUIMultiDay() {
  console.log('🧪 Testing UI multi-day shift display...\n');
  
  // Fetch shifts with multi-day info
  console.log('📥 Fetching shifts from database...');
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('*')
    .gte('date', '2025-12-16')
    .lte('date', '2025-12-18')
    .order('date');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`Found ${shifts.length} shifts`);
  
  // Group by multi_day_set_id
  const multiDayGroups = new Map();
  const regularShifts = [];
  
  shifts.forEach(shift => {
    if (shift.multi_day_set_id) {
      if (!multiDayGroups.has(shift.multi_day_set_id)) {
        multiDayGroups.set(shift.multi_day_set_id, []);
      }
      multiDayGroups.get(shift.multi_day_set_id).push(shift);
    } else {
      regularShifts.push(shift);
    }
  });
  
  console.log(`\n📊 Shift breakdown:`);
  console.log(`  Multi-day sets: ${multiDayGroups.size}`);
  console.log(`  Regular shifts: ${regularShifts.length}`);
  
  if (multiDayGroups.size > 0) {
    console.log('\n🔍 Multi-day shift details:');
    multiDayGroups.forEach((shifts, setId) => {
      console.log(`\n  Set ID: ${setId}`);
      console.log(`  Total shifts in set: ${shifts.length}`);
      shifts.forEach(shift => {
        console.log(`    - ${shift.date}: ${shift.business_name} (${shift.employee_name})`);
        if (shift.multi_day_info) {
          console.log(`      Day ${shift.multi_day_info.day}/${shift.multi_day_info.total_days}`);
          console.log(`      Direction: ${shift.multi_day_info.direction || 'N/A'}`);
        }
      });
    });
    
    console.log('\n✅ UI should display:');
    console.log('  - Merged cells for multi-day shifts');
    console.log('  - Purple background with thick border');
    console.log('  - "(2日間)" label');
    console.log('  - Only show on the first day of the set');
  } else {
    console.log('\n⚠️ No multi-day shifts found in the database');
    console.log('   Please run the shift generation test first');
  }
}

testUIMultiDay().catch(console.error);
