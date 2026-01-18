const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔧 Running database migration for multi-day business support...\n');
  
  const sql = fs.readFileSync('/tmp/add_multi_day_columns.sql', 'utf8');
  
  // Split by semicolon and filter out comments and empty lines
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    console.log(`  ${statement.substring(0, 60)}...`);
    
    try {
      // Use raw SQL execution via Supabase RPC
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      });
      
      if (error) {
        console.error(`  ❌ Error:`, error);
        // Continue with other statements
      } else {
        console.log(`  ✅ Success`);
      }
    } catch (err) {
      console.error(`  ❌ Exception:`, err.message);
    }
  }
  
  console.log('\n🔍 Verifying migration...');
  
  // Check if columns exist
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Error checking table:', error);
  } else {
    const columns = shifts.length > 0 ? Object.keys(shifts[0]) : [];
    console.log('Current columns:', columns);
    
    if (columns.includes('multi_day_set_id') && columns.includes('multi_day_info')) {
      console.log('✅ Migration successful! Columns added.');
    } else {
      console.log('⚠️ Columns may not be visible yet. Trying direct SQL...');
      
      // Try direct SQL query
      const { data: result, error: sqlError } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'shifts' AND column_name IN ('multi_day_set_id', 'multi_day_info')"
      });
      
      if (sqlError) {
        console.error('❌ Error:', sqlError);
      } else {
        console.log('SQL result:', result);
      }
    }
  }
}

runMigration().catch(console.error);
