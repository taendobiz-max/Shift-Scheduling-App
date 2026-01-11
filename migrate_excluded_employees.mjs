import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xtjhqfqfbpqxfvfgdqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0amhxZnFmYnBxeGZ2ZmdkcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3OTQ2NzMsImV4cCI6MjA1MTM3MDY3M30.Rz7cJ0VGKtZNwJO6OP0hnQOPOGNtKDmSIIBBWPGWHSk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('🚀 Starting migration: excluded_employees table');
  
  // Step 1: Create table
  console.log('\n📋 Step 1: Creating table...');
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS excluded_employees (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(20) NOT NULL,
      employee_name VARCHAR(100),
      location VARCHAR(50) NOT NULL,
      reason VARCHAR(200) DEFAULT '管理職・別業務',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_employee_exclusion UNIQUE (employee_id, location)
    );
  `;
  
  const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
  
  if (createError) {
    console.error('❌ Error creating table:', createError);
    console.log('\n💡 Trying alternative method: direct insert...');
  } else {
    console.log('✅ Table created successfully');
  }
  
  // Step 2: Insert initial data
  console.log('\n📋 Step 2: Inserting initial data...');
  
  const excludedEmployees = [
    // 東京拠点（4名）
    { employee_id: '00001000', employee_name: '金井浩', location: '東京', reason: '管理職・別業務' },
    { employee_id: '00001007', employee_name: '西岡竜太', location: '東京', reason: '管理職・別業務' },
    { employee_id: '00001058', employee_name: '小林淳一', location: '東京', reason: '管理職・別業務' },
    { employee_id: '00001069', employee_name: '上野能幸', location: '東京', reason: '管理職・別業務' },
    // 川越拠点（5名）
    { employee_id: '00000169', employee_name: '福井昭彦', location: '川越', reason: '管理職・別業務' },
    { employee_id: '00000193', employee_name: '五十嵐祐人', location: '川越', reason: '管理職・別業務' },
    { employee_id: '00000092', employee_name: '島袋崇', location: '川越', reason: '管理職・別業務' },
    { employee_id: '00000126', employee_name: '飯濱康裕', location: '川越', reason: '管理職・別業務' },
    { employee_id: '00000001', employee_name: '今井淳一', location: '川越', reason: '管理職・別業務' },
    // 川口拠点（3名）
    { employee_id: '00001019', employee_name: '佐藤瞬貴', location: '川口', reason: '管理職・別業務' },
    { employee_id: '00001006', employee_name: '木野英夫', location: '川口', reason: '管理職・別業務' },
    { employee_id: '00003913', employee_name: '二杉泰弘', location: '川口', reason: '管理職・別業務' }
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const employee of excludedEmployees) {
    const { error } = await supabase
      .from('excluded_employees')
      .upsert(employee, { 
        onConflict: 'employee_id,location',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`❌ Error inserting ${employee.employee_name}:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Inserted: ${employee.employee_name} (${employee.location})`);
      successCount++;
    }
  }
  
  console.log(`\n📊 Summary: ${successCount} succeeded, ${errorCount} failed`);
  
  // Step 3: Verify data
  console.log('\n📋 Step 3: Verifying data...');
  const { data, error: selectError } = await supabase
    .from('excluded_employees')
    .select('*')
    .eq('is_active', true)
    .order('location')
    .order('employee_id');
  
  if (selectError) {
    console.error('❌ Error verifying data:', selectError);
  } else {
    console.log(`\n✅ Total excluded employees: ${data.length}`);
    
    const byLocation = data.reduce((acc, emp) => {
      if (!acc[emp.location]) acc[emp.location] = [];
      acc[emp.location].push(emp.employee_name);
      return acc;
    }, {});
    
    console.log('\n📍 By location:');
    for (const [location, names] of Object.entries(byLocation)) {
      console.log(`  ${location}: ${names.length}名 - ${names.join(', ')}`);
    }
  }
  
  console.log('\n🎉 Migration completed!');
}

migrate().catch(console.error);
