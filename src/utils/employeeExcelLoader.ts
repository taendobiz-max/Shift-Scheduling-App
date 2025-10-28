import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

export interface EmployeeMaster {
  employee_id?: string;
  name?: string;
  office?: string;
  roll_call_duty?: string;
  roll_call_capable?: boolean; // New field for roll call capability
  [key: string]: unknown;
}

// Load employees from Excel file and save to Supabase
export const loadEmployeesFromExcel = async (): Promise<EmployeeMaster[]> => {
  try {
    console.log('🔄 Loading employees from Supabase...');
    
    // Load from Supabase using correct English column names
    const { data: existingData, error: fetchError } = await supabase
      .from('employees')
      .select('*')
      .order('employee_id');

    if (!fetchError && existingData && existingData.length > 0) {
      console.log(`✅ Loaded ${existingData.length} employees from Supabase`);
      
      // Normalize roll_call_duty values
      const normalizedData = existingData.map(emp => ({
        ...emp,
        roll_call_duty: emp.roll_call_duty === 'true' || emp.roll_call_duty === '1' ? '1' : '0',
        roll_call_capable: emp.roll_call_capable || emp.roll_call_duty === '1' || emp.roll_call_duty === 'true'
      }));
      
      return normalizedData;
    }

    console.log('📁 No data in Supabase, loading from Excel file...');
    
    // Load from Excel file if no data in Supabase
    const response = await fetch('/uploads/従業員マスタ.xlsx');
    if (!response.ok) {
      throw new Error(`Failed to fetch Excel file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const employees = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (employees.length < 2) {
      throw new Error('Excel file appears to be empty or invalid');
    }
    
    // Get header row and data rows
    const headers = employees[0] as string[];
    const dataRows = employees.slice(1);
    
    // Convert to objects using English column names
    const employeeData: EmployeeMaster[] = dataRows.map((row: unknown[]) => {
      const employee: EmployeeMaster = {};
      headers.forEach((header, index) => {
        if (header && row[index] !== undefined && row[index] !== null) {
          const value = String(row[index]).trim();
          // Map Excel headers to English database column names
          switch (header) {
            case '従業員ID':
              employee['employee_id'] = value;
              break;
            case '氏名':
              employee['name'] = value;
              break;
            case '営業所':
              employee['office'] = value;
              break;
            case '点呼業務':
              employee['roll_call_duty'] = value;
              // Convert to boolean for roll_call_capable
              employee['roll_call_capable'] = value === '1' || value === 'true' || value === '可';
              break;
            default:
              employee[header] = value;
          }
        }
      });
      return employee;
    }).filter(emp => emp['employee_id'] || emp['name']); // Filter out empty rows
    
    console.log(`📊 Parsed ${employeeData.length} employees from Excel`);
    
    if (employeeData.length > 0) {
      // Save to Supabase
      await saveEmployeesToSupabase(employeeData);
      return employeeData;
    } else {
      return [];
    }
  } catch (error) {
    console.error('💥 Error in loadEmployeesFromExcel:', error);
    return [];
  }
};

// Save employees to Supabase (overwrite existing data)
export const saveEmployeesToSupabase = async (employees: EmployeeMaster[]): Promise<void> => {
  try {
    console.log('💾 Overwriting employees in Supabase...');
    
    if (employees.length === 0) {
      throw new Error('No employee data to save');
    }

    // Ensure roll_call_capable column exists
    await ensureRollCallCapableColumn();

    // Clear existing data first
    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('❌ Error clearing existing employees:', deleteError);
    } else {
      console.log('✅ Existing employee data cleared');
    }

    // Insert new data
    const { error } = await supabase
      .from('employees')
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

// Ensure roll_call_capable column exists in the table
const ensureRollCallCapableColumn = async (): Promise<void> => {
  try {
    // Try to select the column to check if it exists
    const { error } = await supabase
      .from('employees')
      .select('roll_call_capable')
      .limit(1);

    if (error && error.message.includes('column "roll_call_capable" does not exist')) {
      console.log('Adding roll_call_capable column to employees table...');
      // Column doesn't exist, we need to add it via SQL
      // This will be handled by the database schema update
    }
  } catch (error) {
    console.error('Error checking roll_call_capable column:', error);
  }
};

// Force reload employees from Excel (overwrite database)
export const reloadEmployeesFromExcel = async (): Promise<EmployeeMaster[]> => {
  try {
    console.log('🔄 Force reloading employees from Excel...');
    
    const response = await fetch('/uploads/従業員マスタ.xlsx');
    if (!response.ok) {
      throw new Error(`Failed to fetch Excel file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const employees = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (employees.length < 2) {
      throw new Error('Excel file appears to be empty or invalid');
    }
    
    // Get header row and data rows
    const headers = employees[0] as string[];
    const dataRows = employees.slice(1);
    
    // Convert to objects using English column names
    const employeeData: EmployeeMaster[] = dataRows.map((row: unknown[]) => {
      const employee: EmployeeMaster = {};
      headers.forEach((header, index) => {
        if (header && row[index] !== undefined && row[index] !== null) {
          const value = String(row[index]).trim();
          // Map Excel headers to English database column names
          switch (header) {
            case '従業員ID':
              employee['employee_id'] = value;
              break;
            case '氏名':
              employee['name'] = value;
              break;
            case '営業所':
              employee['office'] = value;
              break;
            case '点呼業務':
              employee['roll_call_duty'] = value;
              // Convert to boolean for roll_call_capable
              employee['roll_call_capable'] = value === '1' || value === 'true' || value === '可';
              break;
            default:
              employee[header] = value;
          }
        }
      });
      return employee;
    }).filter(emp => emp['employee_id'] || emp['name']); // Filter out empty rows
    
    console.log(`📊 Force loaded ${employeeData.length} employees from Excel`);
    
    if (employeeData.length > 0) {
      await saveEmployeesToSupabase(employeeData);
    }
    
    return employeeData;
  } catch (error) {
    console.error('💥 Error in reloadEmployeesFromExcel:', error);
    return [];
  }
};

// Update single employee in Supabase
export const updateEmployeeInSupabase = async (employeeId: string, updatedData: Partial<EmployeeMaster>): Promise<boolean> => {
  try {
    console.log('💾 Updating employee in Supabase:', employeeId, updatedData);
    
    const { error } = await supabase
      .from('employees')
      .update(updatedData)
      .eq('employee_id', employeeId);

    if (error) {
      console.error('❌ Error updating employee:', error);
      return false;
    }

    console.log('✅ Employee updated successfully');
    return true;
  } catch (error) {
    console.error('💥 Error updating employee:', error);
    return false;
  }
};