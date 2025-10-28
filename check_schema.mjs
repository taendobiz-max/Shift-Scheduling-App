import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjxkiuqxvhfqhsvwqxvj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqeGtpdXF4dmhmcWhzdndxeHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNzk2ODYsImV4cCI6MjA1MDk1NTY4Nn0.Hh1DvRQgXgfPsNOoKhgZbSUTqJvZjfCyVcKfTRjwXJg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('app_9213e72257_shifts')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Shifts table columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data');
  }
}

checkSchema();
