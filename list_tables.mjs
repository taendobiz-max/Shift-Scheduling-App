import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get all tables in the public schema
const { data, error } = await supabase
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public')
  .order('table_name');

if (error) {
  console.error('Error fetching tables:', error);
  // Try alternative method using RPC
  const { data: tables, error: rpcError } = await supabase.rpc('get_tables');
  if (rpcError) {
    console.error('RPC error:', rpcError);
    process.exit(1);
  }
  console.log('Tables:', tables);
} else {
  console.log('Tables in public schema:');
  data.forEach(row => console.log(`  - ${row.table_name}`));
}
