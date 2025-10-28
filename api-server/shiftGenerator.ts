import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseClient';
import { ConstraintEngine } from './constraintEngine';
import { ConstraintManager } from './constraintManager';

// Load business history from database
async function loadBusinessHistoryFromDB(): Promise<Map<string, Set<string>>> {
  console.log('🔍 [DEBUG] loadBusinessHistoryFromDB called');
  const history = new Map<string, Set<string>>();
  
  try {
    const { data, error } = await supabase
      .from('app_9213e72257_employee_business_history')
      .select('employee_id, business_id');
    
    if (error) {
      console.error('⚠️ Failed to load business history from DB:', error);
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
    
    console.log(`📊 Loaded ${data?.length || 0} business history records`);
  } catch (err) {
    console.error('❌ Error loading business history:', err);
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
      console.error('⚠️ Failed to save business history:', error);
    }
  } catch (err) {
    console.error('❌ Error saving business history:', err);
  }
}

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
  business_name?: string;
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
  unassigned_employees?: string[];
  assignment_summary?: {
    total_businesses: number;
    assigned_businesses: number;
    unassigned_businesses: number;
    total_employees: number;
    unassigned_employees?: number;
  };
  assigned_count?: number;
  total_businesses?: number;
  constraint_violations?: any[];
  constraint_report?: any;
  business_history?: Map<string, Set<string>>;
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
function canAssignBusiness(employeeId: string, business: any, currentShifts: Shift[], allBusinessMasters?: any[]): boolean {
  const employeeShifts = getEmployeeShifts(employeeId, currentShifts);
  const newStart = business.開始時間 || business.start_time || '09:00:00';
  const newEnd = business.終了時間 || business.end_time || '17:00:00';
  const businessName = business.業務名 || business.name || 'Unknown';
  
  console.log(`🔍 [TIME_CHECK] Checking ${employeeId} for ${businessName} (${newStart}-${newEnd})`);
  console.log(`🔍 [TIME_CHECK] Employee has ${employeeShifts.length} existing shifts:`, employeeShifts.map(s => `${s.business_group} (${s.start_time}-${s.end_time})`));
  
  for (const shift of employeeShifts) {
    console.log(`🔍 [TIME_CHECK] Comparing with existing shift: ${shift.business_group} (${shift.start_time}-${shift.end_time})`);
    const overlap = timeRangesOverlap(shift.start_time, shift.end_time, newStart, newEnd);
    console.log(`🔍 [TIME_CHECK] Overlap result: ${overlap}`);
    
    if (overlap) {
      console.log(`⚠️ [TIME_CONFLICT] ${employeeId} already assigned to ${shift.business_group} (${shift.start_time}-${shift.end_time}), conflicts with ${businessName} (${newStart}-${newEnd})`);
      return false; // Time conflict
    }
  }
  
  console.log(`✅ [TIME_CHECK] No conflict found for ${employeeId} - ${businessName}`);
  return true;
}

// Enhanced generateShifts function with multi-assignment support
export async function generateShifts(
  employees: any[],
  businessMasters: any[],
  targetDate: string,
  pairGroups?: { [key: string]: any[] },
  location?: string,
  existingBusinessHistory?: Map<string, Set<string>>
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
    
    // Load business history from DB if not provided
    console.log('🔍 [DEBUG] existingBusinessHistory:', existingBusinessHistory);
    let employeeBusinessHistory: Map<string, Set<string>>;
    if (existingBusinessHistory) {
      console.log('🔍 [DEBUG] Using existing business history');
      employeeBusinessHistory = existingBusinessHistory;
      console.log('📚 Using provided business history');
    } else {
      console.log('🔍 [DEBUG] Loading business history from DB');
      employeeBusinessHistory = await loadBusinessHistoryFromDB();
      console.log('📚 Loaded business history from DB:', employeeBusinessHistory.size, 'employees');
    }
    
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
    
    // Initialize history for employees who don't have one yet
    availableEmployees.forEach(emp => {
      const empId = emp.id || emp.従業員ID || emp.employee_id;
      if (!employeeBusinessHistory.has(empId)) {
        employeeBusinessHistory.set(empId, new Set<string>());
      }
    });
    
    // Log current diversity status
    let totalUniqueBusinesses = 0;
    employeeBusinessHistory.forEach((history, empId) => {
      totalUniqueBusinesses += history.size;
    });
    if (employeeBusinessHistory.size > 0) {
      const avgDiversity = totalUniqueBusinesses / employeeBusinessHistory.size;
      console.log(`📊 Average business diversity: ${avgDiversity.toFixed(2)} unique businesses per employee`);
    }
    
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
            // Filter out businesses that have time conflicts with each other
            const nonConflictingGroups: any[][] = [];
            const tempProcessed = new Set<string>();
            
            for (const gb of groupBusinesses) {
              const gbId = gb.業務id || gb.id || gb.業務名 || gb.name;
              if (tempProcessed.has(gbId)) continue;
              
              // Start a new group with this business
              const group: any[] = [gb];
              tempProcessed.add(gbId);
              
              const gbStart = gb.開始時間 || gb.start_time || '09:00:00';
              const gbEnd = gb.終了時間 || gb.end_time || '17:00:00';
              
              // Find other businesses that don't conflict with ANY business in the current group
              for (const other of groupBusinesses) {
                const otherId = other.業務id || other.id || other.業務名 || other.name;
                if (tempProcessed.has(otherId)) continue;
                
                const otherStart = other.開始時間 || other.start_time || '09:00:00';
                const otherEnd = other.終了時間 || other.end_time || '17:00:00';
                
                // Check if times don't overlap with ANY business in the current group
                let hasConflict = false;
                for (const groupBusiness of group) {
                  const groupStart = groupBusiness.開始時間 || groupBusiness.start_time || '09:00:00';
                  const groupEnd = groupBusiness.終了時間 || groupBusiness.end_time || '17:00:00';
                  
                  if (timeRangesOverlap(groupStart, groupEnd, otherStart, otherEnd)) {
                    hasConflict = true;
                    break;
                  }
                }
                
                if (!hasConflict) {
                  group.push(other);
                  tempProcessed.add(otherId);
                }
              }
              
              // Add this group if it has more than 1 business
              if (group.length > 1) {
                nonConflictingGroups.push(group);
              } else {
                // Single business, add to singles later
                singleBusinesses.push(gb);
                processedBusinesses.add(gbId);
              }
            }
            
            // Add non-conflicting groups
            nonConflictingGroups.forEach(group => {
              businessGroups.push(group);
              group.forEach(gb => {
                const gbId = gb.業務id || gb.id || gb.業務名 || gb.name;
                processedBusinesses.add(gbId);
              });
              console.log(`🔗 Paired businesses (by group, non-conflicting): ${group.map(gb => gb.業務名 || gb.name).join(' ↔ ')}`);
            });
            
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
    console.log('📊 Business groups detail:');
    businessGroups.forEach((group, index) => {
      console.log(`  Group ${index + 1}:`, group.map(b => {
        const name = b.業務名 || b.name;
        const start = b.開始時間 || b.start_time || '09:00:00';
        const end = b.終了時間 || b.end_time || '17:00:00';
        return `${name} (${start}-${end})`;
      }));
    });
    console.log('📊 Single businesses:', singleBusinesses.map(b => {
      const name = b.業務名 || b.name;
      const start = b.開始時間 || b.start_time || '09:00:00';
      const end = b.終了時間 || b.end_time || '17:00:00';
      return `${name} (${start}-${end})`;
    }));
    
    let assignedBusinesses = 0;
    
    // PHASE 0: Assign roll call businesses first (highest priority)
    console.log('\n📞 PHASE 0: Assigning roll call businesses...');
    const rollCallBusinesses: any[] = [];
    const nonRollCallSingles: any[] = [];
    
    singleBusinesses.forEach(business => {
      const businessName = business.業務名 || business.name || '';
      const businessGroup = business.業務グループ || business.business_group || '';
      
      // Check if this is a roll call business
      if (businessName.includes('点呼') || businessGroup.includes('点呼')) {
        rollCallBusinesses.push(business);
      } else {
        nonRollCallSingles.push(business);
      }
    });
    
    console.log(`📞 Found ${rollCallBusinesses.length} roll call businesses`);
    
    for (const business of rollCallBusinesses) {
      const businessName = business.業務名 || business.name || 'Unknown';
      const businessId = business.業務id || business.id || 'unknown';
      
      console.log(`🔄 Processing roll call business: ${businessName}`);
      
      // Filter employees who are capable of roll call duty
      const rollCallCapableEmployees = availableEmployees.filter(emp => {
        return emp.roll_call_capable === true || emp.roll_call_duty === '1';
      });
      
      console.log(`👥 Found ${rollCallCapableEmployees.length} roll call capable employees`);
      
      if (rollCallCapableEmployees.length === 0) {
        console.warn('⚠️ No roll call capable employees found, using all available employees');
      }
      
      const candidateEmployees = rollCallCapableEmployees.length > 0 
        ? rollCallCapableEmployees 
        : availableEmployees;
      
      // Sort by assignment count
      const sortedEmployees = candidateEmployees.sort((a, b) => {
        const aId = a.id || a.従業員ID || a.employee_id;
        const bId = b.id || b.従業員ID || b.employee_id;
        return (employeeAssignmentCounts.get(aId) || 0) - (employeeAssignmentCounts.get(bId) || 0);
      });
      
      let selectedEmployee = null;
      
      for (const emp of sortedEmployees) {
        const empId = emp.id || emp.従業員ID || emp.employee_id;
        const currentCount = employeeAssignmentCounts.get(empId) || 0;
        
        // Skip if employee already has 3 assignments
        if (currentCount >= 3) continue;
        
        // Check time conflicts
        if (!canAssignBusiness(empId, business, shifts, businessMasters)) continue;
        
        selectedEmployee = emp;
        break;
      }
      
      if (selectedEmployee) {
        const empId = selectedEmployee.id || selectedEmployee.従業員ID || selectedEmployee.employee_id;
        const empName = selectedEmployee.name || selectedEmployee.氏名 || '名前不明';
        
        const shift: Shift = {
          shift_date: targetDate,
          date: targetDate,
          employee_id: empId,
          employee_name: empName,
          business_group: business.業務グループ || '点呼',
          business_name: business.業務名 || business.業務グループ || '点呼',
          business_master_id: businessId,
          shift_type: 'regular',
          start_time: business.開始時間 || '05:00:00',
          end_time: business.終了時間 || '05:30:00',
          status: 'scheduled',
          generation_batch_id: batchId,
          location: location
        };
        
        shifts.push(shift);
        assignedBusinesses++;
        employeeAssignmentCounts.set(empId, (employeeAssignmentCounts.get(empId) || 0) + 1);
        
        // Update business history for diversity tracking
        const history = employeeBusinessHistory.get(empId) || new Set();
        history.add(businessId);
        employeeBusinessHistory.set(empId, history);
        
        // Save to database
        await saveBusinessHistoryToDB(empId, businessId, targetDate);
        
        console.log(`✅ Assigned roll call business to ${empName} (${empId}, unique businesses: ${history.size})`);
      } else {
        unassigned_businesses.push(businessName);
        violations.push(`${businessName}: 点呼対応可能な従業員がいません`);
        console.log(`⚠️ No available employee for roll call business: ${businessName}`);
      }
    }
    
    // Update singleBusinesses to exclude roll call businesses
    singleBusinesses.length = 0;
    singleBusinesses.push(...nonRollCallSingles);
    
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
        
        // Check time conflicts with existing shifts
        let hasTimeConflict = false;
        for (const business of businessGroup) {
          if (!canAssignBusiness(empId, business, shifts, businessMasters)) {
            hasTimeConflict = true;
            break;
          }
        }
        
        if (hasTimeConflict) continue;
        
        // Check time conflicts within the business group itself
        if (businessGroup.length > 1) {
          for (let i = 0; i < businessGroup.length; i++) {
            for (let j = i + 1; j < businessGroup.length; j++) {
              const business1 = businessGroup[i];
              const business2 = businessGroup[j];
              
              const start1 = business1.開始時間 || business1.start_time || '09:00:00';
              const end1 = business1.終了時間 || business1.end_time || '17:00:00';
              const start2 = business2.開始時間 || business2.start_time || '09:00:00';
              const end2 = business2.終了時間 || business2.end_time || '17:00:00';
              
              if (timeRangesOverlap(start1, end1, start2, end2)) {
                const name1 = business1.業務名 || business1.name || 'Unknown';
                const name2 = business2.業務名 || business2.name || 'Unknown';
                console.log(`⚠️ [GROUP_CONFLICT] Cannot assign ${empId} to business group: ${name1} (${start1}-${end1}) conflicts with ${name2} (${start2}-${end2})`);
                hasTimeConflict = true;
                break;
              }
            }
            if (hasTimeConflict) break;
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
        const history = employeeBusinessHistory.get(empId) || new Set();
        
        for (const business of businessGroup) {
          const businessName = business.業務名 || business.name || `Business_${groupIndex}`;
          const businessId = business.業務id || business.id || `business_${groupIndex}`;
          
          const shift: Shift = {
            shift_date: targetDate,
            date: targetDate,
            employee_id: empId,
            employee_name: empName,
            business_group: business.業務グループ || 'default',
            business_name: business.業務名 || business.業務グループ || 'default',
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
          
          // Update business history for diversity tracking
          history.add(businessId);
          
          // Save to database
          await saveBusinessHistoryToDB(empId, businessId, targetDate);
          
          console.log(`✅ Assigned ${empName} (${empId}) to ${businessName}`);
        }
        
        // Update assignment count and history
        employeeAssignmentCounts.set(empId, (employeeAssignmentCounts.get(empId) || 0) + businessGroup.length);
        employeeBusinessHistory.set(empId, history);
        
        console.log(`📊 ${empName} now has ${employeeAssignmentCounts.get(empId)} assignments, ${history.size} unique businesses`);
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
      // Prioritize employees who haven't done this business before (diversity)
      const sortedEmployees = availableEmployees.sort((a, b) => {
        const aId = a.id || a.従業員ID || a.employee_id;
        const bId = b.id || b.従業員ID || b.employee_id;
        
        // Check if employee has done this business before
        const aHistory = employeeBusinessHistory.get(aId) || new Set();
        const bHistory = employeeBusinessHistory.get(bId) || new Set();
        const aHasDoneBusiness = aHistory.has(businessId);
        const bHasDoneBusiness = bHistory.has(businessId);
        
        // Prioritize employees who haven't done this business
        if (!aHasDoneBusiness && bHasDoneBusiness) return -1;
        if (aHasDoneBusiness && !bHasDoneBusiness) return 1;
        
        // If both have or haven't done it, prioritize by diversity (fewer unique businesses)
        const aDiversity = aHistory.size;
        const bDiversity = bHistory.size;
        if (aDiversity !== bDiversity) {
          return aDiversity - bDiversity; // Prefer less diverse employees to balance
        }
        
        // Finally, sort by assignment count
        return (employeeAssignmentCounts.get(aId) || 0) - (employeeAssignmentCounts.get(bId) || 0);
      });
      
      for (const emp of sortedEmployees) {
        const empId = emp.id || emp.従業員ID || emp.employee_id;
        const currentCount = employeeAssignmentCounts.get(empId) || 0;
        
        // Skip if employee already has 3 assignments
        if (currentCount >= 3) continue;
        
        // Check time conflicts
        if (!canAssignBusiness(empId, business, shifts, businessMasters)) continue;
        
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
          business_name: business.業務名 || business.業務グループ || 'default',
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
        
        // Update business history for diversity tracking
        const history = employeeBusinessHistory.get(empId) || new Set();
        history.add(businessId);
        employeeBusinessHistory.set(empId, history);
        
        // Save to database
        await saveBusinessHistoryToDB(empId, businessId, targetDate);
        
        console.log(`✅ Assigned ${empName} (${empId}) to ${businessName} (total: ${employeeAssignmentCounts.get(empId)}, unique businesses: ${history.size})`);
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
      unassigned_employees: unassignedEmployees,
      assignment_summary: {
        ...assignment_summary,
        unassigned_employees: unassignedEmployees.length
      },
      assigned_count: assignedBusinesses,
      total_businesses: businessMasters.length,
      constraint_violations: constraintViolations,
      constraint_report,
      business_history: employeeBusinessHistory
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

