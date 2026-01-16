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

// Load employees from Supabase
export const loadEmployeesFromSupabase = async (): Promise<Employee[]> => {
  try {
    console.log('🔄 Loading employees from Supabase...');
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('社員番号');

    if (error) {
      console.error('❌ Error loading employees from Supabase:', error);
      return [];
    }

    console.log(`✅ Loaded ${data?.length || 0} employees from Supabase`);
    return data || [];
  } catch (error) {
    console.error('💥 Error in loadEmployeesFromSupabase:', error);
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

// Update employee in Supabase
export const updateEmployeeInSupabase = async (
  employeeId: string, 
  updates: Partial<Employee>
): Promise<boolean> => {
  try {
    console.log(`🔄 Updating employee ${employeeId} in Supabase...`, updates);
    
    const { error } = await supabase
      .from('employees')
      .update(updates)
      .eq('社員番号', employeeId);

    if (error) {
      console.error('❌ Error updating employee in Supabase:', error);
      return false;
    }

    console.log(`✅ Successfully updated employee ${employeeId}`);
    return true;
  } catch (error) {
    console.error('💥 Error in updateEmployeeInSupabase:', error);
    return false;
  }
};

// Delete employee from Supabase
export const deleteEmployeeFromSupabase = async (employeeId: string): Promise<boolean> => {
  try {
    console.log(`🗑️ Deleting employee ${employeeId} from Supabase...`);
    
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('社員番号', employeeId);

    if (error) {
      console.error('❌ Error deleting employee from Supabase:', error);
      return false;
    }

    console.log(`✅ Successfully deleted employee ${employeeId}`);
    return true;
  } catch (error) {
    console.error('💥 Error in deleteEmployeeFromSupabase:', error);
    return false;
  }
};

// Get employee statistics
export const getEmployeeStats = async (): Promise<{
  total: number;
  active: number;
  inactive: number;
  byDepartment: Record<string, number>;
}> => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('所属, 退職年月日');

    if (error) {
      console.error('❌ Error getting employee stats:', error);
      return { total: 0, active: 0, inactive: 0, byDepartment: {} };
    }

    const total = data?.length || 0;
    const active = data?.filter(emp => !emp.退職年月日 || emp.退職年月日 === '').length || 0;
    const inactive = total - active;
    const byDepartment: Record<string, number> = {};
    
    data?.forEach(emp => {
      const dept = emp.所属 || '未設定';
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    });

    return { total, active, inactive, byDepartment };
  } catch (error) {
    console.error('💥 Error getting employee stats:', error);
    return { total: 0, active: 0, inactive: 0, byDepartment: {} };
  }
};