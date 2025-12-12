const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
  console.log('Testing Supabase queries...\n');
  
  // Test business_master
  console.log('1. Testing business_master table:');
  const { data: businessData, error: businessError } = await supabase
    .from('business_master')
    .select('*')
    .limit(5);
  
  if (businessError) {
    console.error('Error:', businessError);
  } else {
    console.log(`Found ${businessData.length} records`);
    console.log('Sample:', businessData[0]);
  }
  
  // Test business_groups
  console.log('\n2. Testing business_groups table:');
  const { data: groupData, error: groupError } = await supabase
    .from('business_groups')
    .select('*')
    .limit(5);
  
  if (groupError) {
    console.error('Error:', groupError);
  } else {
    console.log(`Found ${groupData.length} records`);
    if (groupData.length > 0) {
      console.log('Sample:', groupData[0]);
    }
  }
  
  // Test employees
  console.log('\n3. Testing employees table:');
  const { data: empData, error: empError } = await supabase
    .from('employees')
    .select('employee_id, roll_call_capable, roll_call_duty')
    .limit(5);
  
  if (empError) {
    console.error('Error:', empError);
  } else {
    console.log(`Found ${empData.length} records`);
    if (empData.length > 0) {
      console.log('Sample:', empData[0]);
    }
  }
}

testQueries().catch(console.error);
