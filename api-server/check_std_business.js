const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSTDBusiness() {
  const { data, error } = await supabase
    .from('business_masters')
    .select('business_master_id, business_name, business_group, start_time, end_time, location')
    .or('business_name.ilike.%STD%,business_name.ilike.%夜行%');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('STD便/夜行バスの業務:');
  console.log(JSON.stringify(data, null, 2));
}

checkSTDBusiness();
