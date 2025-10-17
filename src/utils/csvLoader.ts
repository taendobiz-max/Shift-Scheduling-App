import Papa from 'papaparse';
import { supabase } from './supabaseClient';

export interface Employee {
  社員番号?: string;
  氏名?: string;
  所属?: string;
  入社年月日?: string;
  退職年月日?: string;
  生年月日?: string;
  性別?: string;
  住所?: string;
  電話番号?: string;
  メールアドレス?: string;
}

// Load employees from CSV file and save to Supabase
export const loadEmployeesFromCSV = async (): Promise<Employee[]> => {
  try {
    console.log('🔄 Loading employees from CSV and Supabase...');
    
    // First try to load from Supabase
    const { data: existingData, error: fetchError } = await supabase
      .from('app_9213e72257_employees')
      .select('*')
      .order('社員番号');

    if (!fetchError && existingData && existingData.length > 0) {
      console.log(`✅ Loaded ${existingData.length} employees from Supabase`);
      return existingData;
    }

    console.log('📁 No data in Supabase, loading from CSV file...');
    
    // Load from CSV file if no data in Supabase
    const response = await fetch('/uploads/乗務員マスタ.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV file: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: async (results) => {
          try {
            const employees = results.data as Employee[];
            console.log(`📊 Parsed ${employees.length} employees from CSV`);
            
            if (employees.length > 0) {
              // Save to Supabase
              const { error: insertError } = await supabase
                .from('app_9213e72257_employees')
                .insert(employees);

              if (insertError) {
                console.error('❌ Error saving employees to Supabase:', insertError);
                // Still return the data even if save fails
                resolve(employees);
              } else {
                console.log(`✅ Successfully saved ${employees.length} employees to Supabase`);
                resolve(employees);
              }
            } else {
              resolve([]);
            }
          } catch (error) {
            console.error('💥 Error processing CSV data:', error);
            reject(error);
          }
        },
        error: (error) => {
          console.error('💥 Error parsing CSV:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('💥 Error in loadEmployeesFromCSV:', error);
    return [];
  }
};

// Save employees to Supabase
export const saveEmployeesToSupabase = async (employees: Employee[]): Promise<void> => {
  try {
    console.log('💾 Saving employees to Supabase...');
    
    if (employees.length === 0) {
      throw new Error('No employee data to save');
    }

    // Clear existing data first
    const { error: deleteError } = await supabase
      .from('app_9213e72257_employees')
      .delete()
      .neq('社員番号', '');

    if (deleteError) {
      console.error('❌ Error clearing existing employees:', deleteError);
    }

    // Insert new data
    const { error } = await supabase
      .from('app_9213e72257_employees')
      .insert(employees);

    if (error) {
      console.error('❌ Error saving employees to Supabase:', error);
      throw error;
    }

    console.log(`✅ Successfully saved ${employees.length} employees to Supabase`);
  } catch (error) {
    console.error('💥 Error saving employees to Supabase:', error);
    throw error;
  }
};

// Force reload employees from CSV
export const reloadEmployeesFromCSV = async (): Promise<Employee[]> => {
  try {
    console.log('🔄 Force reloading employees from CSV...');
    
    const response = await fetch('/uploads/乗務員マスタ.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV file: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: async (results) => {
          try {
            const employees = results.data as Employee[];
            console.log(`📊 Force loaded ${employees.length} employees from CSV`);
            
            if (employees.length > 0) {
              await saveEmployeesToSupabase(employees);
            }
            
            resolve(employees);
          } catch (error) {
            console.error('💥 Error processing CSV data:', error);
            reject(error);
          }
        },
        error: (error) => {
          console.error('💥 Error parsing CSV:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('💥 Error in reloadEmployeesFromCSV:', error);
    return [];
  }
};