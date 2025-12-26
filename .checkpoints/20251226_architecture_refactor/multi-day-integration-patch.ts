/**
 * Multi-Day Business Integration Patch (Fixed Version)
 * 
 * Integrates round-trip multi-day business handling into the main shift generation flow
 */

import { assignMultiDayBusinessPairs } from './multi-day-pair-handler';

interface Employee {
  employee_id?: string;
  従業員id?: string;
  [key: string]: any;
}

interface Business {
  業務id?: string;
  business_id?: string;
  運行日数?: number;
  duration?: number;
  [key: string]: any;
}

/**
 * Pre-process multi-day businesses before main shift generation
 * 
 * @returns Object containing:
 *   - multiDayShifts: Generated shifts for multi-day businesses
 *   - remainingBusinesses: Businesses that are not multi-day
 *   - remainingEmployees: Employees not assigned to multi-day businesses
 */
export function preprocessMultiDayBusinesses(
  businesses: Business[],
  dates: string[],
  employees: Employee[],
  batchId: string,
  employeeSkillMatrix: any,
  location: string
): {
  multiDayShifts: any[];
  remainingBusinesses: Business[];
  remainingEmployees: Employee[];
  processedBusinessIds: Set<string>;
  assignedEmployeesByDate: Map<string, Set<string>>;
} {
  console.log('\n🔧 [MULTI-DAY PATCH] Pre-processing multi-day businesses');
  console.log('🔍 DEBUG - dates parameter:', JSON.stringify(dates));
  
  // Convert dates array to dateRange object
  // Handle both array of strings and array of objects
  let startDate: string | Date;
  let endDate: string | Date;
  
  if (dates && dates.length > 0 && typeof dates[0] === 'object' && dates[0] !== null && dates[0] && 'start' in dates[0]) {
    // dates is an array of {start, end} objects
    const firstDate = dates[0] as any;
    const lastDate = dates[dates.length - 1] as any;
    startDate = firstDate.start;
    endDate = lastDate.end || lastDate.start;
  } else {
    // dates is an array of date strings
    startDate = dates[0] as string;
    endDate = dates[dates.length - 1] as string;
  }
  
  console.log('🔍 DEBUG - startDate:', startDate, 'endDate:', endDate);
  
  const dateRange = {
    start: startDate,
    end: endDate
  };
  
  // Separate multi-day and single-day businesses
  const multiDayBusinesses: Business[] = [];
  const singleDayBusinesses: Business[] = [];
  
  businesses.forEach(business => {
    // Check both 業務タイプ and 運行日数 for multi-day detection
    const isMultiDayType = business.業務タイプ === 'multi_day';
    const duration = business.運行日数 || business.duration || 1;
    const isMultiDayDuration = Number(duration) === 2;
    
    console.log(`🔍 Business: ${business.業務名}, 業務タイプ: ${business.業務タイプ}, 運行日数: ${duration} (type: ${typeof duration}), isMultiDay: ${isMultiDayType || isMultiDayDuration}`);
    if (isMultiDayType || isMultiDayDuration) {
      multiDayBusinesses.push(business);
    } else {
      singleDayBusinesses.push(business);
    }
  });
  
  console.log(`📊 Multi-day businesses: ${multiDayBusinesses.length}`);
  console.log(`📊 Single-day businesses: ${singleDayBusinesses.length}`);
  
  if (multiDayBusinesses.length === 0) {
    console.log('⚠️ No multi-day businesses found, skipping multi-day processing');
    return {
      multiDayShifts: [],
      remainingBusinesses: businesses,
      remainingEmployees: employees,
      processedBusinessIds: new Set(),
      assignedEmployeesByDate: new Map()
    };
  }
  
  // Assign multi-day businesses
  const multiDayShifts = assignMultiDayBusinessPairs(
    employees,
    multiDayBusinesses,
    dateRange,
    batchId
  );
  
  // Collect employee IDs that were assigned to multi-day businesses
  const assignedEmployeeIds = new Set<string>();
  const assignedEmployeesByDate = new Map<string, Set<string>>();
  
  multiDayShifts.forEach(shift => {
    if (shift.employee_id) {
      assignedEmployeeIds.add(shift.employee_id);
      
      // Track which employees are assigned on which dates
      const shiftDate = shift.date || shift.日付;
      if (shiftDate) {
        if (!assignedEmployeesByDate.has(shiftDate)) {
          assignedEmployeesByDate.set(shiftDate, new Set());
        }
        assignedEmployeesByDate.get(shiftDate)!.add(shift.employee_id);
      }
    }
  });
  
  // Filter out assigned employees
  const remainingEmployees = employees.filter(emp => {
    const empId = emp.employee_id || emp.従業員id || '';
    return !assignedEmployeeIds.has(empId);
  });
  
  // Collect processed business IDs
  const processedBusinessIds = new Set<string>();
  multiDayBusinesses.forEach(business => {
    const businessId = business.業務id || business.business_id || '';
    if (businessId) {
      processedBusinessIds.add(businessId);
    }
  });
  
  console.log(`\n📊 [MULTI-DAY PATCH] Summary:`);
  console.log(`  ✅ Multi-day shifts generated: ${multiDayShifts.length}`);
  console.log(`  👥 Employees assigned to multi-day: ${assignedEmployeeIds.size}`);
  console.log(`  👥 Remaining employees: ${remainingEmployees.length}`);
  console.log(`  📋 Remaining businesses: ${singleDayBusinesses.length}`);
  
  return {
    multiDayShifts,
    remainingBusinesses: singleDayBusinesses,
    remainingEmployees,
    processedBusinessIds,
    assignedEmployeesByDate
  };
}

/**
 * Filter out multi-day businesses from the business list
 * 
 * @param businesses - All businesses
 * @param processedBusinessIds - Set of business IDs that have been processed as multi-day
 * @returns Filtered list of businesses excluding multi-day ones
 */
export function filterOutMultiDayBusinesses(
  businesses: Business[],
  processedBusinessIds: Set<string>
): Business[] {
  return businesses.filter(business => {
    const businessId = business.業務id || business.business_id || '';
    return !processedBusinessIds.has(businessId);
  });
}
