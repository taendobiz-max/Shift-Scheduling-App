import { supabase } from './supabaseClient';
import { loadEmployeesFromExcel, EmployeeMaster } from './employeeExcelLoader';

export interface SkillMatrixRecord {
  id?: string;
  employee_id?: string;
  skill_name?: string;
  business_group?: string;
  skill_level?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface EmployeeSkillSummary {
  employee_name: string;
  employee_id?: string;
  skills: {
    business_group: string;
    skill_level: string;
  }[];
}

export interface EmployeeWithSkills {
  employee_id: string;
  employee_name: string;
  skills: Set<string>;
  skillCount: number;
}

// Load employee data with proper mapping from employee management source
export const loadEmployeeData = async () => {
  try {
    console.log('🔄 Loading employee data from employee management source...');
    const employees = await loadEmployeesFromExcel();
    return employees.map(emp => ({
      employee_id: emp.employee_id || '',
      employee_name: emp.name || emp.employee_id || ''
    })).filter(emp => emp.employee_id); // Filter out entries without employee_id
  } catch (error) {
    console.error('Error loading employee data:', error);
    return [];
  }
};

// Load all skill matrix data from Supabase
export const loadSkillMatrixData = async (): Promise<SkillMatrixRecord[]> => {
  try {
    console.log('🔄 Loading skill matrix data from Supabase...');
    
    const { data, error } = await supabase
      .from('app_9213e72257_skill_matrix')
      .select('*')
      .order('employee_id');

    if (error) {
      console.error('❌ Error loading skill matrix data:', error);
      throw error;
    }

    console.log(`✅ Loaded ${data.length} skill matrix records`);
    return data || [];
  } catch (error) {
    console.error('💥 Error in loadSkillMatrixData:', error);
    return [];
  }
};

// Get employees with skills linked to employee master data, sorted by employee ID
export const getEmployeesWithSkills = async (): Promise<EmployeeWithSkills[]> => {
  try {
    console.log('🔄 Loading employees with skills linked to employee master...');
    
    const [skillMatrixData, employeeData] = await Promise.all([
      loadSkillMatrixData(),
      loadEmployeeData()
    ]);
    
    // Create employee map from employee master data
    const employeeMap = new Map();
    employeeData.forEach(emp => {
      if (emp.employee_id) {
        employeeMap.set(emp.employee_id, emp.employee_name || emp.employee_id);
      }
    });
    
    // Group skills by employee_id and link with employee master
    const employeeSkillsMap = new Map<string, Set<string>>();
    
    skillMatrixData.forEach(record => {
      if (!record.employee_id || !record.business_group) return;
      
      if (!employeeSkillsMap.has(record.employee_id)) {
        employeeSkillsMap.set(record.employee_id, new Set());
      }
      employeeSkillsMap.get(record.employee_id)!.add(record.business_group);
    });
    
    // Create result array with employee master data, including all employees from master
    const result: EmployeeWithSkills[] = [];
    
    // First, add employees who have skills
    employeeSkillsMap.forEach((skills, employeeId) => {
      const employeeName = employeeMap.get(employeeId) || employeeId;
      result.push({
        employee_id: employeeId,
        employee_name: employeeName,
        skills: skills,
        skillCount: skills.size
      });
    });
    
    // Then, add employees from master who don't have skills yet
    employeeData.forEach(emp => {
      if (!employeeSkillsMap.has(emp.employee_id)) {
        result.push({
          employee_id: emp.employee_id,
          employee_name: emp.employee_name,
          skills: new Set(),
          skillCount: 0
        });
      }
    });
    
    // Sort by employee_id in ascending order (numeric sort if possible)
    result.sort((a, b) => {
      // Try numeric sort first
      const aNum = parseInt(a.employee_id);
      const bNum = parseInt(b.employee_id);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      // Fall back to string sort
      return a.employee_id.localeCompare(b.employee_id);
    });
    
    console.log(`✅ Generated ${result.length} employees with skills, sorted by employee ID`);
    return result;
  } catch (error) {
    console.error('💥 Error in getEmployeesWithSkills:', error);
    return [];
  }
};

// Get skill matrix data grouped by employee
export const getEmployeeSkillSummary = async (): Promise<EmployeeSkillSummary[]> => {
  try {
    console.log('🔄 Loading employee skill summary...');
    
    const [skillMatrixData, employeeData] = await Promise.all([
      loadSkillMatrixData(),
      loadEmployeeData()
    ]);
    
    // Create employee map from employee master data
    const employeeMap = new Map();
    employeeData.forEach(emp => {
      if (emp.employee_id) {
        employeeMap.set(emp.employee_id, emp.employee_name || emp.employee_id);
      }
    });
    
    // Group by employee_id (which contains employee name)
    const employeeSkillMap = new Map<string, EmployeeSkillSummary>();
    
    skillMatrixData.forEach(record => {
      if (!record.employee_id) return;
      
      if (!employeeSkillMap.has(record.employee_id)) {
        const employeeName = employeeMap.get(record.employee_id) || record.employee_id;
        employeeSkillMap.set(record.employee_id, {
          employee_name: employeeName,
          employee_id: record.employee_id,
          skills: []
        });
      }
      
      const employee = employeeSkillMap.get(record.employee_id)!;
      if (record.business_group) {
        employee.skills.push({
          business_group: record.business_group,
          skill_level: record.skill_level || '未設定'
        });
      }
    });
    
    // Add employees from master who don't have skills yet
    employeeData.forEach(emp => {
      if (!employeeSkillMap.has(emp.employee_id)) {
        employeeSkillMap.set(emp.employee_id, {
          employee_name: emp.employee_name,
          employee_id: emp.employee_id,
          skills: []
        });
      }
    });
    
    // Convert map to array and sort by employee_id (numeric sort if possible)
    const result = Array.from(employeeSkillMap.values()).sort((a, b) => {
      // Try numeric sort first
      const aNum = parseInt(a.employee_id || '');
      const bNum = parseInt(b.employee_id || '');
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      // Fall back to string sort
      return (a.employee_id || '').localeCompare(b.employee_id || '');
    });
    
    console.log(`✅ Generated skill summary for ${result.length} employees, sorted by employee ID`);
    return result;
  } catch (error) {
    console.error('💥 Error in getEmployeeSkillSummary:', error);
    return [];
  }
};

// Get all unique business groups from skill matrix
export const getSkillMatrixBusinessGroups = async (): Promise<string[]> => {
  try {
    const skillMatrixData = await loadSkillMatrixData();
    const businessGroups = skillMatrixData
      .map(record => record.business_group)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    
    console.log(`✅ Found ${businessGroups.length} unique business groups in skill matrix`);
    return businessGroups;
  } catch (error) {
    console.error('💥 Error in getSkillMatrixBusinessGroups:', error);
    return [];
  }
};

// Get skills for a specific employee
export const getEmployeeSkills = async (employeeName: string): Promise<SkillMatrixRecord[]> => {
  try {
    console.log(`🔄 Loading skills for employee: ${employeeName}`);
    
    const { data, error } = await supabase
      .from('app_9213e72257_skill_matrix')
      .select('*')
      .eq('employee_id', employeeName)
      .order('business_group');

    if (error) {
      console.error('❌ Error loading employee skills:', error);
      throw error;
    }

    console.log(`✅ Loaded ${data.length} skills for ${employeeName}`);
    return data || [];
  } catch (error) {
    console.error('💥 Error in getEmployeeSkills:', error);
    return [];
  }
};

// Add employee skill
export const addEmployeeSkill = async (
  employeeName: string, 
  businessGroup: string, 
  skillLevel: string = '対応可能'
): Promise<boolean> => {
  try {
    console.log(`💾 Adding skill for ${employeeName}: ${businessGroup}`);
    
    const { error } = await supabase
      .from('app_9213e72257_skill_matrix')
      .insert({
        employee_id: employeeName,
        skill_name: businessGroup,
        business_group: businessGroup,
        skill_level: skillLevel
      });

    if (error) {
      console.error('❌ Error adding employee skill:', error);
      return false;
    }

    console.log('✅ Employee skill added successfully');
    return true;
  } catch (error) {
    console.error('💥 Error adding employee skill:', error);
    return false;
  }
};

// Remove employee skill
export const removeEmployeeSkill = async (
  employeeName: string, 
  businessGroup: string
): Promise<boolean> => {
  try {
    console.log(`🗑️ Removing skill for ${employeeName}: ${businessGroup}`);
    
    const { error } = await supabase
      .from('app_9213e72257_skill_matrix')
      .delete()
      .eq('employee_id', employeeName)
      .eq('business_group', businessGroup);

    if (error) {
      console.error('❌ Error removing employee skill:', error);
      return false;
    }

    console.log('✅ Employee skill removed successfully');
    return true;
  } catch (error) {
    console.error('💥 Error removing employee skill:', error);
    return false;
  }
};

// Add or update employee skill
export const updateEmployeeSkill = async (
  employeeName: string, 
  businessGroup: string, 
  skillLevel: string
): Promise<boolean> => {
  try {
    console.log(`💾 Updating skill for ${employeeName}: ${businessGroup} -> ${skillLevel}`);
    
    const { error } = await supabase
      .from('app_9213e72257_skill_matrix')
      .upsert({
        employee_id: employeeName,
        skill_name: businessGroup,
        business_group: businessGroup,
        skill_level: skillLevel
      }, {
        onConflict: 'employee_id,business_group'
      });

    if (error) {
      console.error('❌ Error updating employee skill:', error);
      return false;
    }

    console.log('✅ Employee skill updated successfully');
    return true;
  } catch (error) {
    console.error('💥 Error updating employee skill:', error);
    return false;
  }
};

// Toggle employee skill (add if not exists, remove if exists)
export const toggleEmployeeSkill = async (
  employeeName: string, 
  businessGroup: string
): Promise<boolean> => {
  try {
    console.log(`🔄 Toggling skill for ${employeeName}: ${businessGroup}`);
    
    // Check if skill exists
    const { data: existingSkill, error: checkError } = await supabase
      .from('app_9213e72257_skill_matrix')
      .select('id')
      .eq('employee_id', employeeName)
      .eq('business_group', businessGroup)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking existing skill:', checkError);
      return false;
    }

    if (existingSkill) {
      // Skill exists, remove it
      return await removeEmployeeSkill(employeeName, businessGroup);
    } else {
      // Skill doesn't exist, add it
      return await addEmployeeSkill(employeeName, businessGroup);
    }
  } catch (error) {
    console.error('💥 Error toggling employee skill:', error);
    return false;
  }
};