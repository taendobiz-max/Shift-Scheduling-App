const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .gte('date', '2025-12-10')
    .lte('date', '2025-12-12')
    .not('multi_day_set_id', 'is', null)
    .order('multi_day_set_id')
    .order('date')
    .limit(10);
  
  if (error) {
    console.error(error);
  } else {
    console.log('Sample shifts:');
    data.forEach(s => {
      const info = s.multi_day_info || {};
      console.log(s.multi_day_set_id + ' | ' + s.date + ' | ' + s.business_name);
      console.log('  Team: ' + (info.team || 'N/A') + ', Direction: ' + (info.direction || 'N/A') + ', Day: ' + info.day + '/' + info.total_days);
    });
  }
})();
