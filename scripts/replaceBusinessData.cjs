const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';

const supabase = createClient(supabaseUrl, supabaseKey);

// Format time from Excel format to HH:MM
function formatTime(timeValue) {
  if (!timeValue) return '';
  
  // If it's already in HH:MM format
  if (typeof timeValue === 'string' && timeValue.includes(':')) {
    return timeValue.substring(0, 5); // Take only HH:MM part
  }
  
  // If it's an Excel time serial number
  if (typeof timeValue === 'number') {
    const totalMinutes = Math.round(timeValue * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return String(timeValue).substring(0, 5);
}

// Determine business group based on business ID
function determineBusinessGroup(businessId) {
  if (!businessId) return '';
  
  if (businessId.startsWith('KC')) return 'ちふれ';
  if (businessId.startsWith('KR')) return '路線';
  if (businessId.startsWith('KB')) return '貸切';
  
  return '';
}

async function replaceBusinessMasterData() {
  try {
    console.log('🔄 Starting database replacement with correct Excel data...');
    
    // Step 1: Clear existing data
    console.log('🗑️ Clearing existing business master data...');
    const { error: deleteError } = await supabase
      .from('app_9213e72257_business_master')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (deleteError) {
      console.error('❌ Error clearing existing data:', deleteError);
      throw deleteError;
    }
    console.log('✅ Existing data cleared successfully');
    
    // Step 2: Read new Excel file
    console.log('📖 Reading new Excel file...');
    const workbook = XLSX.readFile('/workspace/uploads/業務マスタ (1).xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${jsonData.length} rows in Excel file`);
    console.log('📋 Sample data:', jsonData.slice(0, 3));
    
    // Step 3: Process and format data
    const businessData = jsonData.map(row => {
      const businessId = row['業務ID'] || row['業務ＩＤ'] || '';
      const mapped = {
        業務id: businessId,  // Use lowercase column name for database
        業務名: row['業務名'] || '',
        開始時間: formatTime(row['勤務開始時刻'] || row['開始時間'] || row['開始時刻'] || ''),
        終了時間: formatTime(row['勤務終了時刻'] || row['終了時間'] || row['終了時刻'] || ''),
        業務グループ: determineBusinessGroup(businessId),
        早朝手当: (row['早朝手当'] && row['早朝手当'] !== 'NaN') ? String(row['早朝手当']) : '',
        深夜手当: (row['深夜手当'] && row['深夜手当'] !== 'NaN') ? String(row['深夜手当']) : '',
        スキルマップ項目名: row['業務グループ名'] || row['スキルマップ項目名'] || row['業務名'] || '',
        ペア業務id: row['ペア業務ID'] || row['ペア業務ＩＤ'] || ''
      };
      return mapped;
    }).filter(item => item.業務id && item.業務名);
    
    console.log(`✅ Processed ${businessData.length} business entries`);
    console.log('📋 Sample processed data:', businessData.slice(0, 3));
    
    // Step 4: Insert new data into Supabase
    console.log('💾 Inserting new data into Supabase...');
    const { data, error: insertError } = await supabase
      .from('app_9213e72257_business_master')
      .insert(businessData);
    
    if (insertError) {
      console.error('❌ Error inserting new data:', insertError);
      throw insertError;
    }
    
    console.log(`✅ Successfully inserted ${businessData.length} business entries into database`);
    
    // Step 5: Verify the data was inserted
    console.log('🔍 Verifying inserted data...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('app_9213e72257_business_master')
      .select('業務id, 業務名, 業務グループ')
      .order('業務id');
    
    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError);
    } else {
      console.log(`✅ Verification complete: ${verifyData.length} records in database`);
      console.log('📋 Sample verified data:', verifyData.slice(0, 5));
    }
    
    console.log('🎉 Database replacement completed successfully!');
    return businessData;
    
  } catch (error) {
    console.error('💥 Error during database replacement:', error);
    throw error;
  }
}

// Run the replacement
replaceBusinessMasterData()
  .then(() => {
    console.log('✅ Database replacement script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database replacement script failed:', error);
    process.exit(1);
  });