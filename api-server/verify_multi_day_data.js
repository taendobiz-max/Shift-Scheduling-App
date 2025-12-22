const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .not('multi_day_set_id', 'is', null)
    .gte('date', '2025-12-10')
    .lte('date', '2025-12-17')
    .order('date');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total multi-day shifts:', data.length);
    console.log('\nAll multi-day shifts:');
    data.forEach(s => {
      console.log(`${s.date}: ${s.business_name} | Set: ${s.multi_day_set_id} | Info: ${JSON.stringify(s.multi_day_info)}`);
    });
  }
})();
