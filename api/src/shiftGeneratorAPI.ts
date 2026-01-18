import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Supabase client for API server
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hbqrxqvdyxkjhiqlmwkd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhicXJ4cXZkeXhramhpcWxtd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0MTU5MjQsImV4cCI6MjA0NDk5MTkyNH0.WZVvfCMdE1Xz2Nv5cYJdZxvOGZJgZYqLgOPTx6VlAYc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Load business history from database
async function loadBusinessHistoryFromDB(): Promise<Map<string, Set<string>>> {
  console.log('🔍 [API] loadBusinessHistoryFromDB called');
  const history = new Map<string, Set<string>>();
  
  try {
    const { data, error } = await supabase
      .from('app_9213e72257_employee_business_history')
      .select('employee_id, business_id');
    
    if (error) {
      console.error('⚠️ [API] Failed to load business history from DB:', error);
      return history;
    }
    
    if (data) {
      data.forEach((record: any) => {
        const empId = record.employee_id;
        const bizId = record.business_id;
        
        if (!history.has(empId)) {
          history.set(empId, new Set<string>());
        }
        history.get(empId)!.add(bizId);
      });
    }
    
    console.log(`📊 [API] Loaded ${data?.length || 0} business history records`);
    console.log(`📚 [API] Loaded business history from DB: ${history.size} employees`);
  } catch (err) {
    console.error('❌ [API] Error loading business history:', err);
  }
  
  return history;
}

// Save business history to database
async function saveBusinessHistoryToDB(
  employeeId: string,
  businessId: string,
  assignedDate: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('app_9213e72257_employee_business_history')
      .upsert({
        employee_id: employeeId,
        business_id: businessId,
        last_assigned_date: assignedDate,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'employee_id,business_id'
      });
    
    if (error) {
      console.error('⚠️ [API] Failed to save business history:', error);
    }
  } catch (err) {
    console.error('❌ [API] Error saving business history:', err);
  }
}

// Main API function to generate shifts for multiple days
export async function generateShiftsAPI(
  employees: any[],
  businessMasters: any[],
  dateRange: string[],
  pairGroups?: { [key: string]: any[] },
  location?: string
) {
  console.log(`🚀 [API] Starting shift generation for ${dateRange.length} days`);
  
  const allShifts: any[] = [];
  const allViolations: string[] = [];
  const allUnassigned: string[] = [];
  
  try {
    // Process each date
    for (const date of dateRange) {
      console.log(`📅 [API] Processing date: ${date}`);
      
      // Always load fresh business history from DB
      const businessHistory = await loadBusinessHistoryFromDB();
      
      // Generate shifts for this date
      const result = await generateShiftsForSingleDay(
        employees,
        businessMasters,
        date,
        pairGroups,
        location,
        businessHistory
      );
      
      // Collect results
      if (result.shifts) {
        allShifts.push(...result.shifts);
      }
      if (result.violations) {
        allViolations.push(...result.violations);
      }
      if (result.unassigned_businesses) {
        allUnassigned.push(...result.unassigned_businesses);
      }
      
      console.log(`✅ [API] Completed ${date}: ${result.shifts?.length || 0} shifts generated`);
      
      // Small delay to ensure DB writes are completed
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 [API] All shifts generated: ${allShifts.length} total shifts`);
    
    return {
      success: true,
      shifts: allShifts,
      violations: allViolations,
      unassigned_businesses: allUnassigned,
      summary: {
        total_shifts: allShifts.length,
        total_days: dateRange.length,
        total_violations: allViolations.length,
        total_unassigned: allUnassigned.length
      }
    };
    
  } catch (error: any) {
    console.error('❌ [API] Error in shift generation:', error);
    return {
      success: false,
      error: error.message,
      shifts: allShifts,
      violations: allViolations,
      unassigned_businesses: allUnassigned
    };
  }
}

// Generate shifts for a single day (simplified version)
async function generateShiftsForSingleDay(
  employees: any[],
  businessMasters: any[],
  targetDate: string,
  pairGroups?: { [key: string]: any[] },
  location?: string,
  businessHistory?: Map<string, Set<string>>
) {
  console.log(`🔧 [API] Generating shifts for ${targetDate}`);
  
  const batchId = uuidv4();
  const shifts: any[] = [];
  const violations: string[] = [];
  const unassigned_businesses: string[] = [];
  
  // Load vacation data
  const { data: vacationData } = await supabase
    .from("app_9213e72257_vacation_masters")
    .select("employee_id")
    .eq("vacation_date", targetDate);
  
  const vacationEmployeeIds = new Set<string>();
  if (vacationData) {
    vacationData.forEach((v: any) => vacationEmployeeIds.add(v.employee_id));
  }
  
  // Filter available employees
  const availableEmployees = employees.filter(emp => 
    !vacationEmployeeIds.has(emp.employee_id || emp.従業員ID)
  );
  
  console.log(`👥 [API] Available employees: ${availableEmployees.length}/${employees.length}`);
  
  // Track employee assignments
  const employeeAssignments = new Map<string, number>();
  availableEmployees.forEach(emp => {
    const empId = emp.employee_id || emp.従業員ID;
    employeeAssignments.set(empId, 0);
  });
  
  // PHASE 0: Assign roll call duties
  const rollCallBusinesses = businessMasters.filter(biz => 
    (biz.業務名 || biz.name || '').includes('点呼') || 
    (biz.業務グループ || biz.business_group || '').includes('点呼')
  );
  
  for (const business of rollCallBusinesses) {
    const rollCallCapableEmployees = availableEmployees.filter(emp => 
      emp.roll_call_capable === true || emp.点呼対応者 === '1' || emp.roll_call_duty === '1'
    );
    
    if (rollCallCapableEmployees.length > 0) {
      // Sort by business diversity and assignment count
      const sortedEmployees = rollCallCapableEmployees.sort((a, b) => {
        const aId = a.employee_id || a.従業員ID;
        const bId = b.employee_id || b.従業員ID;
        const aHistory = businessHistory?.get(aId)?.size || 0;
        const bHistory = businessHistory?.get(bId)?.size || 0;
        const aCount = employeeAssignments.get(aId) || 0;
        const bCount = employeeAssignments.get(bId) || 0;
        
        // Prioritize employees with less business diversity
        if (aHistory !== bHistory) return aHistory - bHistory;
        // Then by assignment count
        return aCount - bCount;
      });
      
      const selectedEmployee = sortedEmployees[0];
      const empId = selectedEmployee.employee_id || selectedEmployee.従業員ID;
      const bizId = business.業務ID || business.business_id;
      
      shifts.push({
        id: uuidv4(),
        shift_date: targetDate,
        employee_id: empId,
        employee_name: selectedEmployee.name || selectedEmployee.氏名,
        business_group: business.業務グループ || business.business_group,
        shift_type: business.業務名 || business.name,
        start_time: business.開始時間 || business.start_time,
        end_time: business.終了時間 || business.end_time,
        status: 'confirmed',
        generation_batch_id: batchId
      });
      
      employeeAssignments.set(empId, (employeeAssignments.get(empId) || 0) + 1);
      await saveBusinessHistoryToDB(empId, bizId, targetDate);
      
      console.log(`✅ [API] Assigned roll call: ${business.業務名 || business.name} → ${selectedEmployee.name || selectedEmployee.氏名}`);
    }
  }
  
  // PHASE 1 & 2: Assign other businesses (simplified)
  const otherBusinesses = businessMasters.filter(biz => 
    !(biz.業務名 || biz.name || '').includes('点呼') && 
    !(biz.業務グループ || biz.business_group || '').includes('点呼')
  );
  
  for (const business of otherBusinesses) {
    // Sort employees by business diversity and assignment count
    const sortedEmployees = availableEmployees.sort((a, b) => {
      const aId = a.employee_id || a.従業員ID;
      const bId = b.employee_id || b.従業員ID;
      const aHistory = businessHistory?.get(aId)?.size || 0;
      const bHistory = businessHistory?.get(bId)?.size || 0;
      const aCount = employeeAssignments.get(aId) || 0;
      const bCount = employeeAssignments.get(bId) || 0;
      
      const bizId = business.業務ID || business.business_id;
      const aHasBiz = businessHistory?.get(aId)?.has(bizId) || false;
      const bHasBiz = businessHistory?.get(bId)?.has(bizId) || false;
      
      // Prioritize employees who haven't done this business
      if (aHasBiz !== bHasBiz) return aHasBiz ? 1 : -1;
      // Then by business diversity
      if (aHistory !== bHistory) return aHistory - bHistory;
      // Then by assignment count
      return aCount - bCount;
    });
    
    if (sortedEmployees.length > 0) {
      const selectedEmployee = sortedEmployees[0];
      const empId = selectedEmployee.employee_id || selectedEmployee.従業員ID;
      const bizId = business.業務ID || business.business_id;
      
      shifts.push({
        id: uuidv4(),
        shift_date: targetDate,
        employee_id: empId,
        employee_name: selectedEmployee.name || selectedEmployee.氏名,
        business_group: business.業務グループ || business.business_group,
        shift_type: business.業務名 || business.name,
        start_time: business.開始時間 || business.start_time,
        end_time: business.終了時間 || business.end_time,
        status: 'confirmed',
        generation_batch_id: batchId
      });
      
      employeeAssignments.set(empId, (employeeAssignments.get(empId) || 0) + 1);
      await saveBusinessHistoryToDB(empId, bizId, targetDate);
    } else {
      unassigned_businesses.push(business.業務名 || business.name);
    }
  }
  
  // Save shifts to database
  if (shifts.length > 0) {
    const { error } = await supabase
      .from('app_9213e72257_shifts')
      .insert(shifts);
    
    if (error) {
      console.error('⚠️ [API] Failed to save shifts:', error);
      violations.push(`Failed to save shifts: ${error.message}`);
    } else {
      console.log(`💾 [API] Saved ${shifts.length} shifts to database`);
    }
  }
  
  return {
    success: true,
    shifts,
    violations,
    unassigned_businesses,
    business_history: businessHistory
  };
}

