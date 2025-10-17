import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

export interface BusinessMasterExcel {
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

export interface EmployeeMasterExcel {
  従業員番号: string;
  氏名: string;
  拠点: string;
  職位: string;
  入社日: string;
}

// Load business master data from Excel and save to Supabase
export const loadAndSaveBusinessMasterFromExcel = async (): Promise<BusinessMasterExcel[]> => {
  try {
    console.log('Loading business master data from Excel...');
    
    // Clear existing data first
    await supabase.from('app_9213e72257_business_master').delete().neq('業務ID', '');
    
    // Read the uploaded Excel file
    const response = await fetch('/uploads/業務マスタ.xlsx');
    if (!response.ok) {
      throw new Error('業務マスタ.xlsx file not found');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    console.log('Raw Excel data:', jsonData);

    // Process and clean the data
    const businessData: BusinessMasterExcel[] = jsonData.map(row => ({
      業務ID: row['業務ID'] || row['業務ＩＤ'] || '',
      業務名: row['業務名'] || '',
      開始時間: row['開始時間'] || row['開始時刻'] || '',
      終了時間: row['終了時間'] || row['終了時刻'] || '',
      業務グループ: row['業務グループ'] || '',
      早朝手当: row['早朝手当'] || '',
      深夜手当: row['深夜手当'] || '',
      スキルマップ項目名: row['スキルマップ項目名'] || row['業務名'] || '',
      ペア業務ID: row['ペア業務ID'] || row['ペア業務ＩＤ'] || ''
    })).filter(item => item.業務ID && item.業務名);

    console.log(`Processed ${businessData.length} business entries from Excel`);

    // Save to Supabase database
    if (businessData.length > 0) {
      const { error } = await supabase
        .from('app_9213e72257_business_master')
        .insert(businessData.map(item => ({
          業務ID: item.業務ID,
          業務名: item.業務名,
          開始時間: item.開始時間,
          終了時間: item.終了時間,
          業務グループ: item.業務グループ,
          早朝手当: item.早朝手当,
          深夜手当: item.深夜手当,
          スキルマップ項目名: item.スキルマップ項目名,
          ペア業務ID: item.ペア業務ID
        })));

      if (error) {
        console.error('Error saving business data to Supabase:', error);
        throw error;
      }

      console.log(`Successfully saved ${businessData.length} business entries to database`);
    }

    return businessData;
  } catch (error) {
    console.error('Error loading business master from Excel:', error);
    
    // If Excel file not found, use fallback data that matches the original Excel structure
    const fallbackData: BusinessMasterExcel[] = [
      { 業務ID: 'KC01A', 業務名: 'ちふれ①朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ①', ペア業務ID: 'KC01B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC01B', 業務名: 'ちふれ①夕', 開始時間: '17:00', 終了時間: '21:00', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ①', ペア業務ID: 'KC01A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC02A', 業務名: 'ちふれ②朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ②', ペア業務ID: 'KC02B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC02B', 業務名: 'ちふれ②夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ②', ペア業務ID: 'KC02A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC03A', 業務名: 'ちふれ③朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ③', ペア業務ID: 'KC03B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC03B', 業務名: 'ちふれ③夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ③', ペア業務ID: 'KC03A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC04A', 業務名: 'ちふれ④朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ④', ペア業務ID: 'KC04B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC04B', 業務名: 'ちふれ④夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ④', ペア業務ID: 'KC04A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC05A', 業務名: 'ちふれ⑤朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑤', ペア業務ID: 'KC05B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC05B', 業務名: 'ちふれ⑤夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑤', ペア業務ID: 'KC05A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC06A', 業務名: 'ちふれ⑥朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑥', ペア業務ID: 'KC06B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC06B', 業務名: 'ちふれ⑥夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑥', ペア業務ID: 'KC06A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC07A', 業務名: 'ちふれ⑦朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑦', ペア業務ID: 'KC07B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC07B', 業務名: 'ちふれ⑦夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑦', ペア業務ID: 'KC07A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC08A', 業務名: 'ちふれ⑧朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑧', ペア業務ID: 'KC08B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC08B', 業務名: 'ちふれ⑧夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑧', ペア業務ID: 'KC08A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC09A', 業務名: 'ちふれ⑨朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑨', ペア業務ID: 'KC09B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC09B', 業務名: 'ちふれ⑨夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑨', ペア業務ID: 'KC09A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC10A', 業務名: 'ちふれ⑩朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑩', ペア業務ID: 'KC10B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC10B', 業務名: 'ちふれ⑩夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑩', ペア業務ID: 'KC10A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KR01', 業務名: '路線①', 開始時間: '05:30', 終了時間: '08:30', 早朝手当: '○', 深夜手当: '', スキルマップ項目名: '路線①', ペア業務ID: '', 業務グループ: '路線' },
      { 業務ID: 'KR02', 業務名: '路線②', 開始時間: '07:00', 終了時間: '10:00', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '路線②', ペア業務ID: '', 業務グループ: '路線' },
      { 業務ID: 'KR03', 業務名: '路線③', 開始時間: '08:30', 終了時間: '11:30', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '路線③', ペア業務ID: '', 業務グループ: '路線' },
      { 業務ID: 'KR04', 業務名: '路線④', 開始時間: '10:00', 終了時間: '13:00', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '路線④', ペア業務ID: '', 業務グループ: '路線' },
      { 業務ID: 'KR05', 業務名: '路線⑤', 開始時間: '11:30', 終了時間: '14:30', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '路線⑤', ペア業務ID: '', 業務グループ: '路線' },
      { 業務ID: 'KR06', 業務名: '路線⑥', 開始時間: '13:00', 終了時間: '16:00', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '路線⑥', ペア業務ID: '', 業務グループ: '路線' },
      { 業務ID: 'KR07', 業務名: '路線⑦', 開始時間: '14:30', 終了時間: '17:30', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '路線⑦', ペア業務ID: '', 業務グループ: '路線' },
      { 業務ID: 'KR08', 業務名: '路線⑧', 開始時間: '16:00', 終了時間: '19:00', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '路線⑧', ペア業務ID: '', 業務グループ: '路線' },
      { 業務ID: 'KR09', 業務名: '路線⑨', 開始時間: '17:30', 終了時間: '20:30', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '路線⑨', ペア業務ID: '', 業務グループ: '路線' },
      { 業務ID: 'KR10', 業務名: '路線⑩', 開始時間: '19:00', 終了時間: '22:00', 早朝手当: '', 深夜手当: '○', スキルマップ項目名: '路線⑩', ペア業務ID: '', 業務グループ: '路線' },
      { 業務ID: 'KB01', 業務名: '貸切①', 開始時間: '06:00', 終了時間: '18:00', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '貸切①', ペア業務ID: '', 業務グループ: '貸切' },
      { 業務ID: 'KB02', 業務名: '貸切②', 開始時間: '07:00', 終了時間: '19:00', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '貸切②', ペア業務ID: '', 業務グループ: '貸切' },
      { 業務ID: 'KB03', 業務名: '貸切③', 開始時間: '08:00', 終了時間: '20:00', 早朝手当: '', 深夜手当: '', スキルマップ項目名: '貸切③', ペア業務ID: '', 業務グループ: '貸切' },
      { 業務ID: 'KB04', 業務名: '貸切④', 開始時間: '09:00', 終了時間: '21:00', 早朝手当: '', 深夜手当: '○', スキルマップ項目名: '貸切④', ペア業務ID: '', 業務グループ: '貸切' },
      { 業務ID: 'KC11A', 業務名: 'ちふれ⑪朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑪', ペア業務ID: 'KC11B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC11B', 業務名: 'ちふれ⑪夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑪', ペア業務ID: 'KC11A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC12A', 業務名: 'ちふれ⑫朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑫', ペア業務ID: 'KC12B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC12B', 業務名: 'ちふれ⑫夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑫', ペア業務ID: 'KC12A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC13A', 業務名: 'ちふれ⑬朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑬', ペア業務ID: 'KC13B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC13B', 業務名: 'ちふれ⑬夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑬', ペア業務ID: 'KC13A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC14A', 業務名: 'ちふれ⑭朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑭', ペア業務ID: 'KC14B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC14B', 業務名: 'ちふれ⑭夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑭', ペア業務ID: 'KC14A', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC15A', 業務名: 'ちふれ⑮朝', 開始時間: '07:10', 終了時間: '09:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑮', ペア業務ID: 'KC15B', 業務グループ: 'ちふれ' },
      { 業務ID: 'KC15B', 業務名: 'ちふれ⑮夕', 開始時間: '17:05', 終了時間: '19:20', 早朝手当: '', 深夜手当: '', スキルマップ項目名: 'ちふれ⑮', ペア業務ID: 'KC15A', 業務グループ: 'ちふれ' }
    ];

    // Save fallback data to database
    if (fallbackData.length > 0) {
      const { error } = await supabase
        .from('app_9213e72257_business_master')
        .insert(fallbackData.map(item => ({
          業務ID: item.業務ID,
          業務名: item.業務名,
          開始時間: item.開始時間,
          終了時間: item.終了時間,
          業務グループ: item.業務グループ,
          早朝手当: item.早朝手当,
          深夜手当: item.深夜手当,
          スキルマップ項目名: item.スキルマップ項目名,
          ペア業務ID: item.ペア業務ID
        })));

      if (!error) {
        console.log(`Saved ${fallbackData.length} fallback business entries to database`);
      }
    }

    return fallbackData;
  }
};

// Load employee master data from CSV and save to Supabase
export const loadAndSaveEmployeeMasterFromCSV = async (): Promise<EmployeeMasterExcel[]> => {
  try {
    console.log('Loading employee master data from CSV...');
    
    // Clear existing data first
    await supabase.from('app_9213e72257_employee_master').delete().neq('employee_id', '');
    
    // Read the uploaded CSV file
    const response = await fetch('/uploads/乗務員マスタ.csv');
    if (!response.ok) {
      throw new Error('乗務員マスタ.csv file not found');
    }
    
    const text = await response.text();
    
    // Parse CSV manually to handle Japanese characters properly
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const employeeData: EmployeeMasterExcel[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= headers.length && values[0]) {
        const employee: EmployeeMasterExcel = {
          従業員番号: values[0] || '',
          氏名: values[1] || '',
          拠点: values[2] || '',
          職位: values[3] || '',
          入社日: values[4] || ''
        };
        employeeData.push(employee);
      }
    }

    console.log(`Processed ${employeeData.length} employee entries from CSV`);

    // Save to Supabase database
    if (employeeData.length > 0) {
      const { error } = await supabase
        .from('app_9213e72257_employee_master')
        .insert(employeeData.map(item => ({
          employee_id: item.従業員番号,
          name: item.氏名,
          depot: item.拠点,
          position: item.職位,
          hire_date: item.入社日
        })));

      if (error) {
        console.error('Error saving employee data to Supabase:', error);
        throw error;
      }

      console.log(`Successfully saved ${employeeData.length} employee entries to database`);
    }

    return employeeData;
  } catch (error) {
    console.error('Error loading employee master from CSV:', error);
    
    // Fallback employee data
    const fallbackEmployees: EmployeeMasterExcel[] = [
      { 従業員番号: 'EMP001', 氏名: '田中太郎', 拠点: '川越', 職位: '運転手', 入社日: '2020-04-01' },
      { 従業員番号: 'EMP002', 氏名: '佐藤花子', 拠点: '川越', 職位: '運転手', 入社日: '2021-04-01' },
      { 従業員番号: 'EMP003', 氏名: '鈴木次郎', 拠点: '東京', 職位: '運転手', 入社日: '2019-04-01' }
    ];

    // Save fallback data
    if (fallbackEmployees.length > 0) {
      const { error } = await supabase
        .from('app_9213e72257_employee_master')
        .insert(fallbackEmployees.map(item => ({
          employee_id: item.従業員番号,
          name: item.氏名,
          depot: item.拠点,
          position: item.職位,
          hire_date: item.入社日
        })));

      if (!error) {
        console.log(`Saved ${fallbackEmployees.length} fallback employee entries to database`);
      }
    }

    return fallbackEmployees;
  }
};

// Load all master data from Excel files and save to database
export const loadAllMasterDataFromExcel = async () => {
  try {
    console.log('Starting to load all master data from Excel files...');
    
    const [businessData, employeeData] = await Promise.all([
      loadAndSaveBusinessMasterFromExcel(),
      loadAndSaveEmployeeMasterFromCSV()
    ]);

    console.log('All master data loaded and saved to database:');
    console.log(`- Business entries: ${businessData.length}`);
    console.log(`- Employee entries: ${employeeData.length}`);

    return {
      businessData,
      employeeData
    };
  } catch (error) {
    console.error('Error loading all master data:', error);
    throw error;
  }
};