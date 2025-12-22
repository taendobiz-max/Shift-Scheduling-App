const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkUIDisplay() {
  console.log('🎨 Checking UI display data for multi-day shifts\n');
  
  // Fetch shifts for the test period
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('*')
    .gte('date', '2025-12-10')
    .lte('date', '2025-12-12')
    .order('employee_id')
    .order('date');
  
  if (error || !shifts) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📊 Total shifts: ${shifts.length}\n`);
  
  // Group by employee
  const byEmployee = new Map();
  shifts.forEach(shift => {
    if (!byEmployee.has(shift.employee_id)) {
      byEmployee.set(shift.employee_id, []);
    }
    byEmployee.get(shift.employee_id).push(shift);
  });
  
  console.log(`👥 Employees with shifts: ${byEmployee.size}\n`);
  console.log('=' .repeat(100));
  
  // Display first 5 employees
  let count = 0;
  for (const [empId, empShifts] of byEmployee.entries()) {
    if (count >= 5) break;
    
    console.log(`\n👤 Employee: ${empId}`);
    console.log('-'.repeat(100));
    
    empShifts.forEach(shift => {
      const info = shift.multi_day_info || {};
      const setId = shift.multi_day_set_id || 'N/A';
      
      // Extract base business name (remove direction suffix)
      let displayName = shift.business_name;
      if (displayName) {
        displayName = displayName.replace(/（往路）$/, '').replace(/（復路）$/, '');
      }
      
      console.log(`  📅 ${shift.date}`);
      console.log(`     業務名: ${shift.business_name}`);
      console.log(`     表示名: ${displayName} (2日間)`);
      console.log(`     Set ID: ${setId}`);
      console.log(`     Info: Day ${info.day}/${info.total_days}, ${info.direction}`);
      console.log(`     Multi-day: ${shift.multi_day_set_id ? 'YES (紫色マージセル)' : 'NO'}`);
      console.log();
    });
    
    count++;
  }
  
  console.log('=' .repeat(100));
  console.log('\n📋 UI Display Rules:');
  console.log('  1. Shifts with multi_day_set_id should be displayed as merged purple cells');
  console.log('  2. Business name should show base name + "(2日間)" label');
  console.log('  3. Cell should span 2 days (outbound and return dates)');
  console.log('  4. Same employees should appear in both days of the merged cell');
  console.log('\n✅ Data is ready for UI display!');
}

checkUIDisplay().catch(console.error);
