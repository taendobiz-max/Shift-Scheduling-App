const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function verifyShiftsDetail() {
  console.log('🔍 Detailed shift verification for 2025-12-10 to 2025-12-12\n');
  
  // Fetch all shifts
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('*')
    .gte('date', '2025-12-10')
    .lte('date', '2025-12-12')
    .order('date')
    .order('employee_id');
  
  if (shiftsError || !shifts) {
    console.error('❌ Error fetching shifts:', shiftsError);
    return;
  }
  
  // Fetch employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*');
  
  if (empError || !employees) {
    console.error('❌ Error fetching employees:', empError);
    return;
  }
  
  // Create employee lookup
  const empMap = new Map();
  employees.forEach(emp => {
    empMap.set(emp.employee_id, emp);
  });
  
  console.log(`📊 Total shifts: ${shifts.length}\n`);
  
  // Group by multi_day_set_id
  const multiDayShifts = shifts.filter(s => s.multi_day_set_id);
  const sets = new Map();
  
  multiDayShifts.forEach(shift => {
    if (!sets.has(shift.multi_day_set_id)) {
      sets.set(shift.multi_day_set_id, []);
    }
    sets.get(shift.multi_day_set_id).push(shift);
  });
  
  console.log(`🎫 Multi-day round-trip sets: ${sets.size}\n`);
  console.log('=' .repeat(80));
  
  // Display each set in detail
  let setNum = 1;
  for (const [setId, setShifts] of sets.entries()) {
    console.log(`\n📦 Set ${setNum}: ${setId}`);
    console.log('-'.repeat(80));
    
    // Get unique employees in this set
    const empIds = [...new Set(setShifts.map(s => s.employee_id))];
    console.log(`👥 Employees (${empIds.length}):`);
    empIds.forEach(empId => {
      const emp = empMap.get(empId);
      if (emp) {
        console.log(`   - ${emp.name} (${emp.班}, ID: ${empId})`);
      } else {
        console.log(`   - Unknown (ID: ${empId})`);
      }
    });
    
    // Sort shifts by date
    setShifts.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`\n📅 Shifts (${setShifts.length}):`);
    setShifts.forEach(shift => {
      const emp = empMap.get(shift.employee_id);
      const empName = emp ? emp.name : 'Unknown';
      const info = shift.multi_day_info || {};
      
      console.log(`   ${shift.date} | ${empName.padEnd(10)} | ${shift.business_name}`);
      console.log(`              | Day ${info.day}/${info.total_days} | ${info.direction} | Set: ${shift.multi_day_set_id}`);
    });
    
    // Verify correctness
    console.log('\n✅ Verification:');
    
    // Check if all employees are the same across days
    const uniqueEmps = [...new Set(setShifts.map(s => s.employee_id))];
    if (uniqueEmps.length === empIds.length) {
      console.log(`   ✓ Same ${empIds.length} employee(s) handle both days`);
    } else {
      console.log(`   ✗ ERROR: Different employees across days!`);
    }
    
    // Check dates are consecutive
    const dates = [...new Set(setShifts.map(s => s.date))].sort();
    if (dates.length === 2) {
      const date1 = new Date(dates[0]);
      const date2 = new Date(dates[1]);
      const diffDays = (date2 - date1) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        console.log(`   ✓ Consecutive dates: ${dates[0]} → ${dates[1]}`);
      } else {
        console.log(`   ✗ ERROR: Dates not consecutive!`);
      }
    }
    
    // Check team assignment based on departure date
    const departureDate = dates[0];
    const day = new Date(departureDate).getDate();
    const isOddDay = day % 2 === 1;
    const expectedTeam = isOddDay ? 'Galaxy' : 'Aube';
    
    const actualTeams = [...new Set(empIds.map(id => {
      const emp = empMap.get(id);
      return emp ? emp.班 : 'Unknown';
    }))];
    
    if (actualTeams.length === 1 && actualTeams[0] === expectedTeam) {
      console.log(`   ✓ Correct team: ${expectedTeam} (departure on day ${day})`);
    } else {
      console.log(`   ✗ ERROR: Expected ${expectedTeam}, got ${actualTeams.join(', ')}`);
    }
    
    setNum++;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Verification complete!');
}

verifyShiftsDetail().catch(console.error);
