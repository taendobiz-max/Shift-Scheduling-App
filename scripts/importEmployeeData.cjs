const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function importEmployeeData() {
  try {
    console.log('🔄 Starting employee data import...');
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../public/uploads/乗務員マスタ.csv');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    console.log('📁 CSV file read successfully');
    
    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8'
    });
    
    if (parseResult.errors.length > 0) {
      console.error('❌ CSV parsing errors:', parseResult.errors);
    }
    
    const employees = parseResult.data;
    console.log(`📊 Parsed ${employees.length} employee records`);
    
    if (employees.length === 0) {
      throw new Error('No employee data found in CSV');
    }
    
    // Clear existing data
    console.log('🗑️ Clearing existing employee data...');
    const { error: deleteError } = await supabase
      .from('app_9213e72257_employees')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('❌ Error clearing existing data:', deleteError);
    } else {
      console.log('✅ Existing data cleared');
    }
    
    // Insert new data
    console.log('💾 Inserting employee data...');
    const { data, error } = await supabase
      .from('app_9213e72257_employees')
      .insert(employees)
      .select();
    
    if (error) {
      console.error('❌ Error inserting employee data:', error);
      throw error;
    }
    
    console.log(`✅ Successfully imported ${data.length} employee records`);
    
    // Verify data
    const { data: verifyData, error: verifyError } = await supabase
      .from('app_9213e72257_employees')
      .select('*', { count: 'exact' });
    
    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError);
    } else {
      console.log(`✅ Verification: ${verifyData.length} records in database`);
    }
    
  } catch (error) {
    console.error('💥 Error importing employee data:', error);
    process.exit(1);
  }
}

importEmployeeData();