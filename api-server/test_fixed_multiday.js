const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testFixedMultiDay() {
  console.log('🧪 Testing fixed multi-day implementation\n');
  
  // 1. Clear existing shifts for test period
  console.log('🗑️  Clearing existing shifts for 2025-12-10 to 2025-12-12...');
  const { error: deleteError } = await supabase
    .from('shifts')
    .delete()
    .gte('date', '2025-12-10')
    .lte('date', '2025-12-12');
  
  if (deleteError) {
    console.error('❌ Delete error:', deleteError);
    return;
  }
  console.log('✅ Cleared\n');
  
  // 2. Fetch employees (Tokyo office, Galaxy/Aube teams)
  console.log('👥 Fetching employees...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('office', '東京')
    .in('班', ['Galaxy', 'Aube']);
  
  if (empError || !employees) {
    console.error('❌ Employee fetch error:', empError);
    return;
  }
  console.log(`✅ Found ${employees.length} employees`);
  console.log(`   - Galaxy: ${employees.filter(e => e.班 === 'Galaxy').length}`);
  console.log(`   - Aube: ${employees.filter(e => e.班 === 'Aube').length}\n`);
  
  // 3. Fetch multi-day businesses
  console.log('📋 Fetching multi-day businesses...');
  const { data: businesses, error: busError } = await supabase
    .from('business_master')
    .select('*')
    .eq('運行日数', 2)
    .eq('営業所', '東京');
  
  if (busError || !businesses) {
    console.error('❌ Business fetch error:', busError);
    return;
  }
  console.log(`✅ Found ${businesses.length} multi-day businesses\n`);
  
  // 4. Call shift generation API
  console.log('🚀 Calling shift generation API...');
  const response = await fetch('http://localhost:3000/api/generate-shifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employees: employees,
      businessMasters: businesses,
      dateRange: {
        start: '2025-12-10',
        end: '2025-12-12'
      }
    })
  });
  
  const result = await response.json();
  console.log('📊 Generation result:', JSON.stringify(result, null, 2));
  console.log();
  
  // 5. Verify generated shifts
  console.log('🔍 Verifying generated shifts...');
  const { data: shifts, error: shiftError } = await supabase
    .from('shifts')
    .select('*')
    .gte('date', '2025-12-10')
    .lte('date', '2025-12-12')
    .order('date')
    .order('employee_id');
  
  if (shiftError || !shifts) {
    console.error('❌ Shift fetch error:', shiftError);
    return;
  }
  
  console.log(`✅ Total shifts generated: ${shifts.length}\n`);
  
  // 6. Analyze multi-day shifts
  const multiDayShifts = shifts.filter(s => s.multi_day_set_id);
  console.log(`📊 Multi-day shifts: ${multiDayShifts.length}`);
  
  if (multiDayShifts.length > 0) {
    // Group by set_id
    const sets = new Map();
    multiDayShifts.forEach(shift => {
      if (!sets.has(shift.multi_day_set_id)) {
        sets.set(shift.multi_day_set_id, []);
      }
      sets.get(shift.multi_day_set_id).push(shift);
    });
    
    console.log(`📦 Number of round-trip sets: ${sets.size}\n`);
    
    // Display details for each set
    let setNum = 1;
    for (const [setId, setShifts] of sets.entries()) {
      console.log(`\n🎫 Set ${setNum}: ${setId}`);
      
      // Get employee info
      const empIds = [...new Set(setShifts.map(s => s.employee_id))];
      const empNames = empIds.map(id => {
        const emp = employees.find(e => e.従業員id === id);
        return emp ? `${emp.氏名} (${emp.班})` : id;
      });
      
      console.log(`   👥 Employees: ${empNames.join(', ')}`);
      console.log(`   📅 Shifts:`);
      
      setShifts.forEach(shift => {
        const info = shift.multi_day_info || {};
        console.log(`      - ${shift.date}: ${shift.business_name} (Day ${info.day}/${info.total_days}, ${info.direction})`);
      });
      
      setNum++;
    }
  }
  
  console.log('\n✅ Test complete!');
}

testFixedMultiDay().catch(console.error);
