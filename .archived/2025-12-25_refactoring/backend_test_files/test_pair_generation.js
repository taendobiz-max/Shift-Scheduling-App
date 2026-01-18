const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPairGeneration() {
  console.log('🧪 Testing team-based pair generation\n');
  
  // Delete existing shifts for test period
  const testStart = '2025-12-10';
  const testEnd = '2025-12-12';
  
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
  
  console.log('✅ Deleted existing shifts\n');
  
  // Call shift generation API
  console.log('📞 Calling shift generation API...\n');
  
  const { generateShifts } = require('./shiftGenerator');
  
  const result = await generateShifts({
    startDate: testStart,
    endDate: testEnd,
    location: '東京'
  });
  
  console.log('\n📊 Generation result:');
  console.log(`  Total shifts: ${result.shifts?.length || 0}`);
  console.log(`  Multi-day shifts: ${result.shifts?.filter(s => s.multi_day_set_id).length || 0}`);
  
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
    
    console.log('✅ Saved to database');
    
    // Verify saved data
    console.log('\n🔍 Verifying saved data...');
    const { data: saved, error: queryError } = await supabase
      .from('shifts')
      .select('date, employee_name, business_name, multi_day_set_id, multi_day_info')
      .gte('date', testStart)
      .lte('date', testEnd)
      .not('multi_day_set_id', 'is', null)
      .order('date')
      .order('employee_name');
    
    if (queryError) {
      console.error('Query error:', queryError);
      return;
    }
    
    console.log(`\nFound ${saved.length} multi-day shifts:\n`);
    
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
        console.log(`  ${s.date}: ${s.employee_name} - ${s.business_name}`);
        console.log(`    Team: ${info.team || 'N/A'}, Direction: ${info.direction || 'N/A'}, Day: ${info.day}/${info.total_days}`);
      });
      console.log('');
    });
  }
  
  console.log('✅ Test complete!');
}

testPairGeneration().catch(console.error);
