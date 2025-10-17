const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function replaceEmployeeData() {
  try {
    console.log('🔄 Starting employee data replacement...');
    
    // Read Excel file
    const excelPath = path.join(__dirname, '../public/uploads/従業員マスタ.xlsx');
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel file not found: ${excelPath}`);
    }
    
    console.log('📁 Reading Excel file...');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length < 2) {
      throw new Error('Excel file appears to be empty or invalid');
    }
    
    // Get header row and data rows
    const headers = rawData[0];
    const dataRows = rawData.slice(1);
    
    console.log('📋 Headers found:', headers);
    console.log(`📊 Data rows: ${dataRows.length}`);
    
    // Convert to objects using the CORRECT English column names from database schema
    const employees = dataRows.map((row) => {
      const employee = {};
      headers.forEach((header, index) => {
        if (header && row[index] !== undefined && row[index] !== null) {
          const value = String(row[index]).trim();
          // Map Excel headers to CORRECT English database column names
          switch (header) {
            case '従業員ID':
              employee['employee_id'] = value; // English column name
              break;
            case '氏名':
              employee['name'] = value; // English column name
              break;
            case '営業所':
              employee['office'] = value; // English column name
              break;
            case '点呼業務':
              employee['roll_call_duty'] = value; // English column name
              break;
            default:
              // Keep original header for any additional columns
              employee[header] = value;
          }
        }
      });
      return employee;
    }).filter(emp => emp['employee_id'] || emp['name']); // Filter out empty rows
    
    console.log(`📊 Processed ${employees.length} employee records`);
    console.log('📋 Sample record:', employees[0]);
    
    if (employees.length === 0) {
      throw new Error('No valid employee data found in Excel');
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
    console.log('💾 Inserting new employee data...');
    const { data, error } = await supabase
      .from('app_9213e72257_employees')
      .insert(employees)
      .select();
    
    if (error) {
      console.error('❌ Error inserting employee data:', error);
      throw error;
    }
    
    console.log(`✅ Successfully replaced with ${data.length} employee records`);
    
    // Verify data
    const { data: verifyData, error: verifyError } = await supabase
      .from('app_9213e72257_employees')
      .select('*', { count: 'exact' });
    
    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError);
    } else {
      console.log(`✅ Verification: ${verifyData.length} records in database`);
      console.log('📋 Sample record from DB:', verifyData[0]);
    }
    
  } catch (error) {
    console.error('💥 Error replacing employee data:', error);
    process.exit(1);
  }
}

replaceEmployeeData();