const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPairGeneration() {
  console.log('🧪 Testing team-based pair generation\n');
  
  // Test period
  const testStart = '2025-12-10';
  const testEnd = '2025-12-12';
  const dates = ['2025-12-10', '2025-12-11', '2025-12-12'];
  
  // Delete existing shifts
  console.log(`🗑️  Deleting existing shifts from ${testStart} to ${testEnd}...`);
  const { error: deleteError } = await supabase
    .from('shifts')
    .delete()
    .gte('date', testStart)
    .lte('date', testEnd);
  
  if (deleteError) {
    console.error('Delete error:', deleteError);
    return;
  }
  console.log('✅ Deleted\n');
  
  // Load employees
  console.log('📥 Loading employees...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('office', '東京');
  
  if (empError) {
    console.error('Employee error:', empError);
    return;
  }
  console.log(`✅ Loaded ${employees.length} employees\n`);
  
  // Load business masters
  console.log('📥 Loading business masters...');
  const { data: businessMasters, error: bmError } = await supabase
    .from('business_master')
    .select('*')
    .eq('営業所', '東京');
  
  if (bmError) {
    console.error('Business master error:', bmError);
    return;
  }
  console.log(`✅ Loaded ${businessMasters.length} business masters\n`);
  
  // Call shift generation
  console.log('📞 Calling generateShifts...\n');
  const { generateShifts } = require('./shiftGenerator');
  
  const result = await generateShifts(
    employees,
    businessMasters,
    dates,
    {},
    '東京'
  );
  
  console.log('\n📊 Generation result:');
  console.log(`  Total shifts: ${result.shifts?.length || 0}`);
  const multiDayShifts = result.shifts?.filter(s => s.multi_day_set_id) || [];
  console.log(`  Multi-day shifts: ${multiDayShifts.length}`);
  
  // Save to database
  if (result.shifts && result.shifts.length > 0) {
    console.log('\n💾 Saving shifts to database...');
    
    const { error: insertError } = await supabase
      .from('shifts')
      .insert(result.shifts);
    
    if (insertError) {
      console.error('Insert error:', insertError);
      return;
    }
    
    console.log('✅ Saved\n');
    
    // Verify
    console.log('🔍 Verifying multi-day shifts...\n');
    const { data: saved, error: queryError } = await supabase
      .from('shifts')
      .select('date, employee_name, business_name, multi_day_set_id, multi_day_info')
      .gte('date', testStart)
      .lte('date', testEnd)
      .not('multi_day_set_id', 'is', null)
      .order('multi_day_set_id')
      .order('date');
    
    if (queryError) {
      console.error('Query error:', queryError);
      return;
    }
    
    console.log(`Found ${saved.length} multi-day shifts:\n`);
    
    // Group by set_id
    const sets = {};
    saved.forEach(s => {
      if (!sets[s.multi_day_set_id]) {
        sets[s.multi_day_set_id] = [];
      }
      sets[s.multi_day_set_id].push(s);
    });
    
    Object.keys(sets).forEach(setId => {
      console.log(`${setId}:`);
      sets[setId].forEach(s => {
        const info = s.multi_day_info || {};
        const dateStr = new Date(s.date).toISOString().split('T')[0];
        console.log(`  ${dateStr}: ${s.employee_name} - ${s.business_name}`);
        console.log(`    Team: ${info.team || 'N/A'}, Direction: ${info.direction || 'N/A'}, Day: ${info.day}/${info.total_days}`);
      });
      console.log('');
    });
  }
  
  console.log('✅ Test complete!');
}

testPairGeneration().catch(console.error);
