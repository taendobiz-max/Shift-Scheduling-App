const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk2MzczMSwiZXhwIjoyMDcyNTM5NzMxfQ.gX7wLvAfd2LwDmMwLHmDlAqsrdloDGc7jhvJzDf0zoM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRules() {
  const { data, error } = await supabase
    .from('business_rules')
    .select('rule_id, rule_name, enabled, 営業所, priority')
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Business Rules:');
    console.table(data);
    console.log(`\nTotal rules: ${data.length}`);
    console.log(`Enabled rules: ${data.filter(r => r.enabled).length}`);
  }
}

checkRules();
