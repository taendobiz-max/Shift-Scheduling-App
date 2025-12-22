const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backupDatabase() {
  console.log('📦 Creating database backup...');
  
  // Backup business_master
  const { data: businessMasters, error: bmError } = await supabase
    .from('business_master')
    .select('*');
  
  if (bmError) {
    console.error('❌ Error backing up business_master:', bmError);
    return;
  }
  
  // Backup shifts (use correct column name)
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('*')
    .gte('date', '2025-12-15')
    .lte('date', '2025-12-31');
  
  if (shiftsError) {
    console.error('❌ Error backing up shifts:', shiftsError);
    return;
  }
  
  const backup = {
    timestamp: new Date().toISOString(),
    business_masters: businessMasters,
    shifts: shifts
  };
  
  const fs = require('fs');
  const backupPath = `.checkpoints/db_backup_${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  
  console.log(`✅ Database backup created: ${backupPath}`);
  console.log(`   - Business masters: ${businessMasters.length}`);
  console.log(`   - Shifts: ${shifts.length}`);
}

backupDatabase();
