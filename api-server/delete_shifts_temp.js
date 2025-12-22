const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .delete()
    .in('date', ['2025-12-15', '2025-12-16']);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Deleted shifts for 2025-12-15 and 2025-12-16');
  }
}

deleteShifts();
