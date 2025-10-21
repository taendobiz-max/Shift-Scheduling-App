import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseClient';
import { ConstraintEngine } from './constraintEngine';
import { ConstraintManager } from './constraintManager';

export interface ShiftConstraint {
  id: string;
  constraint_name: string;
  constraint_type: string;
  constraint_value: number;
  constraint_description: string;
  is_active: boolean;
}

export interface Employee {
  employee_id: string;
  name: string;
}

export interface BusinessGroup {
  name: string;
}

export interface SkillAssignment {
  employee_id: string;
  business_group: string;
  skill_level: string;
}

export interface Shift {
  id?: string;
  shift_date: string;
  employee_id: string;
  employee_name?: string;
  business_group: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  status: string;
  generation_batch_id?: string;
  business_master_id?: string;
  date?: string;
  location?: string;
}

export interface GenerationResult {
  success: boolean;
  batch_id: string;
  shifts: Shift[];
  violations: string[];
  generation_time: number;
  unassigned_businesses?: string[];
  assignment_summary?: {
    total_businesses: number;
    assigned_businesses: number;
    unassigned_businesses: number;
    total_employees: number;
  };
  assigned_count?: number;
  total_businesses?: number;
  constraint_violations?: any[];
  constraint_report?: any;
}

// Helper function to check if two time ranges overlap
function timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = new Date(`2000-01-01T${start1}`);
  const e1 = new Date(`2000-01-01T${end1}`);
  const s2 = new Date(`2000-01-01T${start2}`);
  const e2 = new Date(`2000-01-01T${end2}`);
  
  return s1 < e2 && s2 < e1;
}

// Helper function to get employee's current shifts for time overlap check
function getEmployeeShifts(employeeId: string, shifts: Shift[]): Shift[] {
  return shifts.filter(s => s.employee_id === employeeId);
}

// Helper function to check if a business can be assigned to an employee (time-wise)
function canAssignBusiness(employeeId: string, business: any, currentShifts: Shift[]): boolean {
  const employeeShifts = getEmployeeShifts(employeeId, currentShifts);
  const newStart = business.開始時間 || business.start_time || '09:00:00';
  const newEnd = business.終了時間 || business.end_time || '17:00:00';
  
  for (const shift of employeeShifts) {
    if (timeRangesOverlap(shift.start_time, shift.end_time, newStart, newEnd)) {
      return false; // Time conflict
    }
  }
  
  return true;
}

// Enhanced generateShifts function with multi-assignment support
export async function generateShifts(
  employees: any[],
  businessMasters: any[],
  targetDate: string,
  pairGroups?: { [key: string]: any[] },
  location?: string
): Promise<GenerationResult> {
  console.log('🚀 Starting enhanced shift generation with multi-assignment for:', targetDate);
  console.log('👥 Available employees:', employees.length);
  console.log('🏢 Business masters:', businessMasters.length);
  console.log('📍 Location:', location);
  
  try {
    const batchId = uuidv4();
    const shifts: Shift[] = [];
    const violations: string[] = [];
    const unassigned_businesses: string[] = [];
    const constraintViolations: any[] = [];
    
    // Initialize constraint engine
    const constraintEngine = new ConstraintEngine();
    await constraintEngine.loadConstraints(location);
    
    console.log('📋 Loaded constraints:', constraintEngine.getConstraintCount());
    
    // Load vacation data for the target date
    const { data: vacationData, error: vacationError } = await supabase
      .from("app_9213e72257_vacation_masters")
      .select("employee_id")
      .eq("vacation_date", targetDate);
    
    const vacationEmployeeIds = new Set<string>();
    if (!vacationError && vacationData) {
      vacationData.forEach((v: any) => vacationEmployeeIds.add(v.employee_id));
      console.log("🏖️ Employees on vacation:", vacationEmployeeIds.size, "IDs:", Array.from(vacationEmployeeIds));
    } else if (vacationError) {
      console.warn("⚠️ Failed to load vacation data:", vacationError.message);
    }
    
    // Filter out employees on vacation
    const availableEmployees = employees.filter(emp => {
      const empId = emp.id || emp.従業員ID || emp.employee_id;
      return !vacationEmployeeIds.has(empId);
    });
    
    console.log('👥 Available employees (after vacation filter):', availableEmployees.length);
    
    if (availableEmployees.length === 0) {
      console.error('❌ No employees available after filtering vacations');
      return {
        success: false,
        batch_id: batchId,
        shifts: [],
        violations: ['従業員が全員休暇中です'],
        generation_time: 0,
        unassigned_businesses: businessMasters.map(b => b.業務名 || b.name || 'Unknown'),
        assignment_summary: {
          total_businesses: businessMasters.length,
          assigned_businesses: 0,
          unassigned_businesses: businessMasters.length,
          total_employees: employees.length
        },
        assigned_count: 0,
        total_businesses: businessMasters.length,
        constraint_violations: [],
        constraint_report: null
      };
    }
    
    if (!businessMasters || businessMasters.length === 0) {
      console.error('❌ No business masters provided');
      return {
        success: false,
        batch_id: batchId,
        shifts: [],
        violations: ['業務マスターデータが見つかりません'],
        generation_time: 0,
        unassigned_businesses: [],
        unassigned_employees: [],
        assignment_summary: {
          total_businesses: 0,
          assigned_businesses: 0,
          unassigned_businesses: 0,
          total_employees: availableEmployees.length,
          unassigned_employees: 0
        },
        assigned_count: 0,
        total_businesses: 0,
        constraint_violations: [],
        constraint_report: null
      };
    }
    
    // Track employee assignment counts
    const employeeAssignmentCounts = new Map<string, number>();
    availableEmployees.forEach(emp => {
      const empId = emp.id || emp.従業員ID || emp.employee_id;
      employeeAssignmentCounts.set(empId, 0);
    });
    
    // Group businesses by pair (if they have pair information)
    const businessGroups: any[][] = [];
    const singleBusinesses: any[] = [];
    const processedBusinesses = new Set<string>();
    
    // First, group by business group (e.g., "309 A便")
    const businessGroupMap = new Map<string, any[]>();
    businessMasters.forEach((business) => {
      const businessGroup = business.業務グループ || business.business_group;
      if (businessGroup) {
        if (!businessGroupMap.has(businessGroup)) {
          businessGroupMap.set(businessGroup, []);
        }
        businessGroupMap.get(businessGroup)!.push(business);
      }
    });
    
    // Then, process each business
    businessMasters.forEach((business) => {
      const businessId = business.業務id || business.id || business.業務名 || business.name;
      
      if (processedBusinesses.has(businessId)) return;
      
      // Check if this business has a pair ID
      const pairBusinessId = business.ペア業務id || business.pair_business_id;
      if (pairBusinessId && pairGroups && pairGroups[pairBusinessId]) {
        const pairBusinesses = pairGroups[pairBusinessId];
        if (pairBusinesses.length > 1) {
          businessGroups.push(pairBusinesses);
          pairBusinesses.forEach(pb => {
            const pbId = pb.業務id || pb.id || pb.業務名 || pb.name;
            processedBusinesses.add(pbId);
          });
          console.log(`🔗 Paired businesses (by ID): ${pairBusinesses.map(pb => pb.業務名 || pb.name).join(' ↔ ')}`);
          return;
        }
      }
      
      // Check if this business has a business group with multiple businesses
      const businessGroup = business.業務グループ || business.business_group;
      if (businessGroup && businessGroupMap.has(businessGroup)) {
        const groupBusinesses = businessGroupMap.get(businessGroup)!;
        if (groupBusinesses.length > 1) {
          // Check if any business in this group is already processed
          const alreadyProcessed = groupBusinesses.some(gb => {
            const gbId = gb.業務id || gb.id || gb.業務名 || gb.name;
            return processedBusinesses.has(gbId);
          });
          
          if (!alreadyProcessed) {
            businessGroups.push(groupBusinesses);
            groupBusinesses.forEach(gb => {
              const gbId = gb.業務id || gb.id || gb.業務名 || gb.name;
              processedBusinesses.add(gbId);
            });
            console.log(`🔗 Paired businesses (by group): ${groupBusinesses.map(gb => gb.業務名 || gb.name).join(' ↔ ')}`);
            return;
          } else {
            // Already processed as part of a group
            processedBusinesses.add(businessId);
            return;
          }
        }
      }
      
      // Single business (no pair)
      singleBusinesses.push(business);
      processedBusinesses.add(businessId);
    });
    
    console.log(`📊 Business groups: ${businessGroups.length} pairs, ${singleBusinesses.length} singles`);
    
    let assignedBusinesses = 0;
    
    // PHASE 1: Assign pair businesses (priority)
    console.log('\n🔗 PHASE 1: Assigning pair businesses...');
    for (let groupIndex = 0; groupIndex < businessGroups.length; groupIndex++) {
      const businessGroup = businessGroups[groupIndex];
      console.log(`🔄 Processing pair group ${groupIndex + 1}:`, businessGroup.map(b => b.業務名 || b.name));
      
      let selectedEmployee = null;
      let minViolations = Infinity;
      
      // Find employee with least assignments who can handle this pair
      const sortedEmployees = availableEmployees.sort((a, b) => {
        const aId = a.id || a.従業員ID || a.employee_id;
        const bId = b.id || b.従業員ID || b.employee_id;
        return (employeeAssignmentCounts.get(aId) || 0) - (employeeAssignmentCounts.get(bId) || 0);
      });
      
      for (const emp of sortedEmployees) {
        const empId = emp.id || emp.従業員ID || emp.employee_id;
        const currentCount = employeeAssignmentCounts.get(empId) || 0;
        
        // Skip if employee already has 3 assignments
        if (currentCount >= 3) continue;
        
        // Check time conflicts
        let hasTimeConflict = false;
        for (const business of businessGroup) {
          if (!canAssignBusiness(empId, business, shifts)) {
            hasTimeConflict = true;
            break;
          }
        }
        
        if (hasTimeConflict) continue;
        
        // Test constraint validation for each business in the group
        let totalViolations = 0;
        let canAssign = true;
        
        for (const business of businessGroup) {
          const testShift: Shift = {
            shift_date: targetDate,
            employee_id: empId,
            business_group: business.業務グループ || 'default',
            shift_type: 'regular',
            start_time: business.開始時間 || '09:00:00',
            end_time: business.終了時間 || '17:00:00',
            status: 'scheduled'
          };
          
          const validationResult = await constraintEngine.validateShiftAssignment(
            {
              id: empId,
              name: emp.name || emp.氏名 || '名前不明',
              location: emp.location || emp.拠点 || location || '',
              employee_id: empId
            },
            testShift,
            shifts
          );
          
          if (!validationResult.canProceed) {
            canAssign = false;
            break;
          }
          
          totalViolations += validationResult.violations.length;
        }
        
        if (canAssign && totalViolations < minViolations) {
          selectedEmployee = emp;
          minViolations = totalViolations;
          
          if (totalViolations === 0) {
            break; // Found perfect match
          }
        }
      }
      
      if (selectedEmployee) {
        const empId = selectedEmployee.id || selectedEmployee.従業員ID || selectedEmployee.employee_id;
        const empName = selectedEmployee.name || selectedEmployee.氏名 || '名前不明';
        
        // Assign all businesses in the pair to this employee
        businessGroup.forEach((business) => {
          const businessName = business.業務名 || business.name || `Business_${groupIndex}`;
          const businessId = business.業務id || business.id || `business_${groupIndex}`;
          
          const shift: Shift = {
            shift_date: targetDate,
            date: targetDate,
            employee_id: empId,
            employee_name: empName,
            business_group: business.業務グループ || 'default',
            business_master_id: businessId,
            shift_type: 'regular',
            start_time: business.開始時間 || '09:00:00',
            end_time: business.終了時間 || '17:00:00',
            status: 'scheduled',
            generation_batch_id: batchId,
            location: location
          };
          
          shifts.push(shift);
          assignedBusinesses++;
          
          console.log(`✅ Assigned ${empName} (${empId}) to ${businessName}`);
        });
        
        // Update assignment count
        employeeAssignmentCounts.set(empId, (employeeAssignmentCounts.get(empId) || 0) + businessGroup.length);
      } else {
        // No available employee for this pair
        businessGroup.forEach((business) => {
          const businessName = business.業務名 || business.name || `Business_${groupIndex}`;
          unassigned_businesses.push(businessName);
          violations.push(`${businessName}: アサイン可能な従業員がいません`);
          console.log(`⚠️ No available employee for ${businessName}`);
        });
      }
    }
    
    // PHASE 2: Assign single businesses (balance-aware)
    console.log('\n📋 PHASE 2: Assigning single businesses (balance-aware)...');
    for (const business of singleBusinesses) {
      const businessName = business.業務名 || business.name || 'Unknown';
      const businessId = business.業務id || business.id || 'unknown';
      
      console.log(`🔄 Processing single business: ${businessName}`);
      
      let selectedEmployee = null;
      let minViolations = Infinity;
      
      // Find employee with least assignments who can handle this business
      const sortedEmployees = availableEmployees.sort((a, b) => {
        const aId = a.id || a.従業員ID || a.employee_id;
        const bId = b.id || b.従業員ID || b.employee_id;
        return (employeeAssignmentCounts.get(aId) || 0) - (employeeAssignmentCounts.get(bId) || 0);
      });
      
      for (const emp of sortedEmployees) {
        const empId = emp.id || emp.従業員ID || emp.employee_id;
        const currentCount = employeeAssignmentCounts.get(empId) || 0;
        
        // Skip if employee already has 3 assignments
        if (currentCount >= 3) continue;
        
        // Check time conflicts
        if (!canAssignBusiness(empId, business, shifts)) continue;
        
        // Test constraint validation
        const testShift: Shift = {
          shift_date: targetDate,
          employee_id: empId,
          business_group: business.業務グループ || 'default',
          shift_type: 'regular',
          start_time: business.開始時間 || '09:00:00',
          end_time: business.終了時間 || '17:00:00',
          status: 'scheduled'
        };
        
        const validationResult = await constraintEngine.validateShiftAssignment(
          {
            id: empId,
            name: emp.name || emp.氏名 || '名前不明',
            location: emp.location || emp.拠点 || location || '',
            employee_id: empId
          },
          testShift,
          shifts
        );
        
        if (!validationResult.canProceed) continue;
        
        const totalViolations = validationResult.violations.length;
        
        if (totalViolations < minViolations) {
          selectedEmployee = emp;
          minViolations = totalViolations;
          
          if (totalViolations === 0) {
            break; // Found perfect match
          }
        }
      }
      
      if (selectedEmployee) {
        const empId = selectedEmployee.id || selectedEmployee.従業員ID || selectedEmployee.employee_id;
        const empName = selectedEmployee.name || selectedEmployee.氏名 || '名前不明';
        
        const shift: Shift = {
          shift_date: targetDate,
          date: targetDate,
          employee_id: empId,
          employee_name: empName,
          business_group: business.業務グループ || 'default',
          business_master_id: businessId,
          shift_type: 'regular',
          start_time: business.開始時間 || '09:00:00',
          end_time: business.終了時間 || '17:00:00',
          status: 'scheduled',
          generation_batch_id: batchId,
          location: location
        };
        
        shifts.push(shift);
        assignedBusinesses++;
        
        // Update assignment count
        employeeAssignmentCounts.set(empId, (employeeAssignmentCounts.get(empId) || 0) + 1);
        
        console.log(`✅ Assigned ${empName} (${empId}) to ${businessName} (total: ${employeeAssignmentCounts.get(empId)})`);
      } else {
        unassigned_businesses.push(businessName);
        violations.push(`${businessName}: アサイン可能な従業員がいません`);
        console.log(`⚠️ No available employee for ${businessName}`);
      }
    }
    
    // Log constraint violations
    if (constraintViolations.length > 0) {
      await constraintEngine.logViolations(constraintViolations, batchId);
    }
    
    // Generate assignment summary
    const assignment_summary = {
      total_businesses: businessMasters.length,
      assigned_businesses: assignedBusinesses,
      unassigned_businesses: unassigned_businesses.length,
      total_employees: availableEmployees.length
    };
    
    const constraint_report = {
      total_constraints: constraintEngine.getConstraintCount(),
      constraint_violations: constraintViolations.length,
      mandatory_violations: constraintViolations.filter(v => v.severity_level === 'critical').length,
      warning_violations: constraintViolations.filter(v => v.severity_level === 'warning').length
    };
    
    console.log('\n📊 Generation Summary:');
    console.log('✅ Assigned businesses:', assignedBusinesses);
    console.log('⚠️ Unassigned businesses:', unassigned_businesses.length);
    console.log('⚠️ Violations:', violations.length);
    
    // Log employee assignment distribution
    console.log('\n👥 Employee Assignment Distribution:');
    const unassignedEmployees: any[] = [];
    employeeAssignmentCounts.forEach((count, empId) => {
      const emp = availableEmployees.find(e => (e.id || e.従業員ID || e.employee_id) === empId);
      const empName = emp ? (emp.name || emp.氏名 || '名前不明') : '不明';
      if (count > 0) {
        console.log(`  ${empName} (${empId}): ${count} 業務`);
      } else {
        // アサインされなかった従業員を非勤務者リストに追加
        unassignedEmployees.push({
          employee_id: empId,
          name: empName,
          shift_date: targetDate,
          status: 'unassigned'
        });
        console.log(`  ${empName} (${empId}): 非勤務`);
      }
    });
    
    console.log(`\n📋 Unassigned employees: ${unassignedEmployees.length}`);
    
    // Consider it successful if we assigned at least some shifts
    const isSuccessful = shifts.length > 0;
    
    return {
      success: isSuccessful,
      batch_id: batchId,
      shifts,
      violations,
      generation_time: 0.1,
      unassigned_businesses,
      unassigned_employees,
      assignment_summary: {
        ...assignment_summary,
        unassigned_employees: unassignedEmployees.length
      },
      assigned_count: assignedBusinesses,
      total_businesses: businessMasters.length,
      constraint_violations: constraintViolations,
      constraint_report
    };
    
  } catch (error) {
    console.error('❌ Error in generateShifts:', error);
    return {
      success: false,
      batch_id: uuidv4(),
      shifts: [],
      violations: [`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`],
      generation_time: 0,
      unassigned_businesses: [],
      unassigned_employees: [],
      assignment_summary: {
        total_businesses: businessMasters?.length || 0,
        assigned_businesses: 0,
        unassigned_businesses: businessMasters?.length || 0,
        total_employees: employees?.length || 0,
        unassigned_employees: 0
      },
      assigned_count: 0,
      total_businesses: businessMasters?.length || 0,
      constraint_violations: [],
      constraint_report: null
    };
  }
}

// ... (rest of the file remains the same)

