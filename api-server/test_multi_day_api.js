const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMultiDayAPI() {
  console.log('🧪 Testing multi-day shift generation API...\n');
  
  // Fetch employees
  console.log('📥 Fetching employees...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('office', '川越')
    .limit(20);
  
  if (empError) {
    console.error('❌ Error fetching employees:', empError);
    return;
  }
  
  console.log(`  Found ${employees.length} employees`);
  
  // Fetch business masters (including multi-day businesses)
  console.log('📥 Fetching business masters...');
  const { data: businessMasters, error: bmError } = await supabase
    .from('business_master')
    .select('*')
    .or('営業所.eq.川越,業務タイプ.eq.multi_day');
  
  if (bmError) {
    console.error('❌ Error fetching business masters:', bmError);
    return;
  }
  
  console.log(`  Found ${businessMasters.length} business masters`);
  
  // Check for multi-day businesses
  const multiDayBusinesses = businessMasters.filter(b => b.業務タイプ === 'multi_day');
  console.log(`  Multi-day businesses: ${multiDayBusinesses.length}`);
  multiDayBusinesses.forEach(b => {
    console.log(`    - ${b.業務id}: ${b.業務名} (${b.運行日数} days, ${b.方向})`);
  });
  
  // Call the generateShifts function directly
  console.log('\n📞 Calling generateShifts function...');
  const { generateShifts } = require('./dist/shiftGenerator');
  
  const result = await generateShifts(
    employees,
    businessMasters,
    ['2025-12-16', '2025-12-17'],
    {},
    '川越'
  );
  
  console.log('\n✅ Generation complete');
  console.log(`  Total shifts: ${result.shifts.length}`);
  console.log(`  Success: ${result.success}`);
  
  // Filter multi-day shifts
  const multiDayShifts = result.shifts.filter(s => 
    s.business_name?.includes('ギャラクシー') || s.business_name?.includes('オーブ')
  );
  
  console.log(`  Multi-day shifts: ${multiDayShifts.length}`);
  
  if (multiDayShifts.length > 0) {
    console.log('\n  Multi-day shift details:');
    multiDayShifts.forEach(shift => {
      console.log(`    - ${shift.date}: ${shift.business_name} (${shift.employee_name || 'N/A'})`);
      console.log(`      Time: ${shift.start_time} - ${shift.end_time}`);
      console.log(`      Set ID: ${shift.multi_day_set_id || 'N/A'}`);
      if (shift.multi_day_info) {
        console.log(`      Day: ${shift.multi_day_info.day} / ${shift.multi_day_info.total_days}`);
        console.log(`      Direction: ${shift.multi_day_info.direction || 'N/A'}`);
      }
    });
  } else {
    console.log('  ⚠️ No multi-day shifts found');
  }
  
  // Validation
  const galaxyShifts = multiDayShifts.filter(s => 
    s.business_name?.includes('ギャラクシー') && s.date === '2025-12-16'
  );
  
  const aubeShifts = multiDayShifts.filter(s => 
    s.business_name?.includes('オーブ') && s.date === '2025-12-17'
  );
  
  console.log('\n🔍 Validation:');
  if (galaxyShifts.length > 0) {
    console.log('  ✅ Galaxy correctly assigned on even day (2025-12-16)');
  } else {
    console.log('  ❌ Galaxy NOT assigned on even day (2025-12-16)');
  }
  
  if (aubeShifts.length > 0) {
    console.log('  ✅ Aube correctly assigned on odd day (2025-12-17)');
  } else {
    console.log('  ❌ Aube NOT assigned on odd day (2025-12-17)');
  }
}

testMultiDayAPI().catch(console.error);
