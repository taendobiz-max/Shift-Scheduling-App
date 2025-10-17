const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function importSkillMatrix() {
  try {
    console.log('🔄 Starting skill matrix data import...');
    
    // Read Excel file
    const excelPath = path.join(__dirname, '../public/uploads/担当可能業務マスタ.xlsx');
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
    
    // Process matrix format: first column is employee name, subsequent columns are business groups
    const skillMatrixData = [];
    
    dataRows.forEach((row, rowIndex) => {
      const employeeName = row[0]; // First column is employee name
      
      if (!employeeName || typeof employeeName !== 'string') {
        console.log(`⚠️  Skipping row ${rowIndex + 1}: No employee name`);
        return;
      }
      
      // Process each business group column (starting from index 1)
      headers.forEach((header, colIndex) => {
        if (colIndex === 0 || !header) return; // Skip first column (employee name) and empty headers
        
        const cellValue = row[colIndex];
        
        // Check if employee can perform this business group (marked with "レ" or similar)
        if (cellValue && (cellValue === 'レ' || cellValue === '○' || cellValue === '◯' || cellValue === 'X' || cellValue === '×')) {
          // Clean up business group name (remove line breaks and extra spaces)
          const businessGroup = header.replace(/\r?\n/g, ' ').trim();
          
          // Use correct database column names based on schema
          skillMatrixData.push({
            employee_id: employeeName.trim(), // Map to employee_id column
            skill_name: businessGroup, // Map to skill_name column
            business_group: businessGroup, // Map to business_group column
            skill_level: cellValue === 'レ' || cellValue === '○' || cellValue === '◯' ? '対応可能' : '要確認'
          });
        }
      });
    });
    
    console.log(`📊 Processed ${skillMatrixData.length} skill matrix records`);
    console.log('📋 Sample records:', skillMatrixData.slice(0, 3));
    
    if (skillMatrixData.length === 0) {
      throw new Error('No valid skill matrix data found in Excel');
    }
    
    // Clear existing skill matrix data
    console.log('🗑️ Clearing existing skill matrix data...');
    const { error: deleteError } = await supabase
      .from('app_9213e72257_skill_matrix')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('❌ Error clearing existing data:', deleteError);
    } else {
      console.log('✅ Existing skill matrix data cleared');
    }
    
    // Insert new data in batches to avoid timeout
    console.log('💾 Inserting new skill matrix data...');
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < skillMatrixData.length; i += batchSize) {
      const batch = skillMatrixData.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('app_9213e72257_skill_matrix')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        throw error;
      }
      
      insertedCount += data.length;
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} records`);
    }
    
    console.log(`✅ Successfully imported ${insertedCount} skill matrix records`);
    
    // Verify data
    const { data: verifyData, error: verifyError } = await supabase
      .from('app_9213e72257_skill_matrix')
      .select('*', { count: 'exact' });
    
    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError);
    } else {
      console.log(`✅ Verification: ${verifyData.length} records in database`);
      console.log('📋 Sample record from DB:', verifyData[0]);
    }
    
  } catch (error) {
    console.error('💥 Error importing skill matrix data:', error);
    process.exit(1);
  }
}

importSkillMatrix();