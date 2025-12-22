const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Get employee IDs
  const { data: emps } = await supabase
    .from('employees')
    .select('employee_id, name, 班')
    .in('name', ['小原礼', '外園淳也']);
  
  console.log('Employees:');
  emps.forEach(e => console.log('  ' + e.name + ' (' + e.班 + '): ' + e.employee_id));
  console.log('');
  
  const empIds = emps.map(e => e.employee_id);
  
  // Get shifts for 12/10
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('date', '2025-12-10')
    .in('employee_id', empIds)
    .not('multi_day_set_id', 'is', null)
    .order('business_name');
  
  console.log('Shifts on 2025-12-10:');
  shifts.forEach(s => {
    const emp = emps.find(e => e.employee_id === s.employee_id);
    const info = s.multi_day_info || {};
    console.log(s.business_name + ':');
    console.log('  Employee: ' + emp.name + ' (' + emp.班 + ')');
    console.log('  Team: ' + info.team + ', Direction: ' + info.direction);
    console.log('  Set ID: ' + s.multi_day_set_id);
    console.log('');
  });
})();
