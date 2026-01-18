import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

export interface CorrectBusinessMaster {
  業務ID: string;
  業務名: string;
  開始時間: string;
  終了時間: string;
  業務グループ?: string;
  早朝手当?: string;
  深夜手当?: string;
  スキルマップ項目名?: string;
  ペア業務ID?: string;
}

// Load correct business master data from the new Excel file
export const loadCorrectBusinessMasterFromExcel = async (): Promise<CorrectBusinessMaster[]> => {
  try {
    console.log('🔄 Loading CORRECT business master data from new Excel file...');
    
    // Read the new uploaded Excel file
    const response = await fetch('/uploads/業務マスタ (1).xlsx');
    if (!response.ok) {
      throw new Error('業務マスタ (1).xlsx file not found');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    console.log('📊 Raw Excel data from new file:', jsonData);

    // Process and clean the data with proper column mapping
    const businessData: CorrectBusinessMaster[] = jsonData.map(row => {
      const mapped = {
        業務ID: row['業務ID'] || row['業務ＩＤ'] || '',
        業務名: row['業務名'] || '',
        開始時間: formatTime(row['勤務開始時刻'] || row['開始時間'] || row['開始時刻'] || ''),
        終了時間: formatTime(row['勤務終了時刻'] || row['終了時間'] || row['終了時刻'] || ''),
        業務グループ: determineBusinessGroup(row['業務ID'] || row['業務ＩＤ'] || ''),
        早朝手当: row['早朝手当'] || '',
        深夜手当: row['深夜手当'] || '',
        スキルマップ項目名: row['スキルマップ項目名'] || row['業務名'] || '',
        ペア業務ID: row['ペア業務ID'] || row['ペア業務ＩＤ'] || ''
      };
      console.log('🔄 Mapped entry:', mapped);
      return mapped;
    }).filter(item => item.業務ID && item.業務名);

    console.log(`✅ Processed ${businessData.length} business entries from new Excel file`);
    return businessData;
  } catch (error) {
    console.error('💥 Error loading correct business master from Excel:', error);
    throw error;
  }
};

// Format time from Excel format to HH:MM
function formatTime(timeValue: any): string {
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
function determineBusinessGroup(businessId: string): string {
  if (!businessId) return '';
  
  if (businessId.startsWith('KC')) return 'ちふれ';
  if (businessId.startsWith('KR')) return '路線';
  if (businessId.startsWith('KB')) return '貸切';
  
  return '';
}

// Save correct data to Supabase database
export const saveCorrectBusinessMasterToSupabase = async (businessData: CorrectBusinessMaster[]): Promise<void> => {
  try {
    console.log('💾 Saving correct business data to Supabase...');
    
    if (businessData.length === 0) {
      throw new Error('No business data to save');
    }

    const { error } = await supabase
      .from('business_master')
      .insert(businessData.map(item => ({
        業務id: item.業務ID,  // Use lowercase column name
        業務名: item.業務名,
        開始時間: item.開始時間,
        終了時間: item.終了時間,
        業務グループ: item.業務グループ,
        早朝手当: item.早朝手当,
        深夜手当: item.深夜手当,
        スキルマップ項目名: item.スキルマップ項目名,
        ペア業務id: item.ペア業務ID
      })));

    if (error) {
      console.error('❌ Error saving correct business data to Supabase:', error);
      throw error;
    }

    console.log(`✅ Successfully saved ${businessData.length} correct business entries to Supabase`);
  } catch (error) {
    console.error('💥 Error saving correct data to Supabase:', error);
    throw error;
  }
};

// Complete process: load from Excel and save to Supabase
export const replaceBusinessMasterWithCorrectData = async (): Promise<CorrectBusinessMaster[]> => {
  try {
    console.log('🔄 Starting complete database replacement with correct Excel data...');
    
    // Load correct data from new Excel file
    const correctData = await loadCorrectBusinessMasterFromExcel();
    
    // Save to Supabase (database is already cleared)
    await saveCorrectBusinessMasterToSupabase(correctData);
    
    console.log(`✅ Database successfully replaced with ${correctData.length} correct business entries`);
    return correctData;
  } catch (error) {
    console.error('💥 Error replacing business master data:', error);
    throw error;
  }
};