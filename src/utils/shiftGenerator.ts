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
  business_group: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  status: string;
  generation_batch_id?: string;
  business_master_id?: string;
  date?: string;
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

// Enhanced generateShifts function with constraint engine integration
export async function generateShifts(
  employees: any[],
  businessMasters: any[],
  targetDate: string,
  pairGroups?: { [key: string]: any[] },
  location?: string
): Promise<GenerationResult> {
  console.log('🚀 Starting enhanced shift generation with constraints for:', targetDate);
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
      const isOnVacation = vacationEmployeeIds.has(empId);
      if (isOnVacation) {
        console.log("🏖️ Skipping employee on vacation:", emp.name || emp.氏名, empId);
      }
      return !isOnVacation;
    });
    
    console.log("👥 Available employees after vacation filter:", availableEmployees.length, "of", employees.length);
    // Validate input data
    if (!employees || employees.length === 0) {
      console.error('❌ No employees provided');
      return {
        success: false,
        batch_id: batchId,
        shifts: [],
        violations: ['従業員データが見つかりません'],
        generation_time: 0,
        unassigned_businesses: [],
        assignment_summary: {
          total_businesses: businessMasters.length,
          assigned_businesses: 0,
          unassigned_businesses: businessMasters.length,
          total_employees: 0
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
        assignment_summary: {
          total_businesses: 0,
          assigned_businesses: 0,
          unassigned_businesses: 0,
          total_employees: employees.length
        },
        assigned_count: 0,
        total_businesses: 0,
        constraint_violations: [],
        constraint_report: null
      };
    }

    console.log('📋 Processing business assignments with constraint validation...');
    
    // Group businesses by pair (if they have pair information)
    const businessGroups: any[][] = [];
    const processedBusinesses = new Set<string>();
    
    businessMasters.forEach((business) => {
      const businessId = business.業務id || business.id || business.業務名 || business.name;
      
      if (processedBusinesses.has(businessId)) return;
      
      // Check if this business has a pair
      const pairBusinessId = business.ペア業務id || business.pair_business_id;
      if (pairBusinessId && pairGroups && pairGroups[pairBusinessId]) {
        const pairBusinesses = pairGroups[pairBusinessId];
        if (pairBusinesses.length > 1) {
          businessGroups.push(pairBusinesses);
          pairBusinesses.forEach(pb => {
            const pbId = pb.業務id || pb.id || pb.業務名 || pb.name;
            processedBusinesses.add(pbId);
          });
          console.log(`🔗 Paired businesses: ${pairBusinesses.map(pb => pb.業務名 || pb.name).join(' ↔ ')}`);
          return;
        }
      }
      
      // Single business (no pair)
      businessGroups.push([business]);
      processedBusinesses.add(businessId);
    });
    
    // Track used employees to avoid double assignment on the same date
    const usedEmployees = new Set<string>();
    let assignedBusinesses = 0;
    
    // Process each business group (single or pair) with constraint validation
    for (let groupIndex = 0; groupIndex < businessGroups.length; groupIndex++) {
      const businessGroup = businessGroups[groupIndex];
      console.log(`🔄 Processing business group ${groupIndex + 1}:`, businessGroup.map(b => b.業務名 || b.name));
      
      // Find available employees with constraint validation
      let selectedEmployee = null;
      let bestEmployee = null;
      let minViolations = Infinity;
      
      for (const emp of availableEmployees) {
        const empId = emp.id || emp.従業員ID || emp.employee_id || `emp_${groupIndex}`;
        
        // Skip if employee already used
        if (usedEmployees.has(empId)) continue;
        
        // Test constraint validation for each business in the group
        let totalViolations = 0;
        let canAssign = true;
        const testViolations: any[] = [];
        
        for (const business of businessGroup) {
          const businessName = business.業務名 || business.name || `Business_${groupIndex}`;
          
          // Create test shift
          const testShift: Shift = {
            shift_date: targetDate,
            employee_id: empId,
            business_group: business.業務グループ || 'default',
            shift_type: 'regular',
            start_time: business.開始時間 || '09:00:00',
            end_time: business.終了時間 || '17:00:00',
            status: 'scheduled'
          };
          
          // Validate constraints
          const validationResult = constraintEngine.validateShiftAssignment(
            {
              id: empId,
              name: emp.name || emp.氏名 || '名前不明',
              location: emp.location || emp.拠点 || location || '',
              employee_id: empId
            },
            testShift,
            shifts // existing shifts for this generation
          );
          
          if (!validationResult.canProceed) {
            canAssign = false;
            break;
          }
          
          totalViolations += validationResult.violations.length;
          testViolations.push(...validationResult.violations);
        }
        
        if (canAssign && totalViolations < minViolations) {
          bestEmployee = emp;
          minViolations = totalViolations;
          
          // If we found an employee with no violations, use them
          if (totalViolations === 0) {
            selectedEmployee = emp;
            break;
          }
        }
      }
      
      // Use the best employee found (either no violations or minimum violations)
      if (!selectedEmployee && bestEmployee) {
        selectedEmployee = bestEmployee;
      }
      
      if (selectedEmployee) {
        const empId = selectedEmployee.id || selectedEmployee.従業員ID || selectedEmployee.employee_id || `emp_${groupIndex}`;
        const empName = selectedEmployee.name || selectedEmployee.氏名 || '名前不明';
        
        // Assign the same employee to all businesses in the group (for pairs)
        businessGroup.forEach((business) => {
          const businessName = business.業務名 || business.name || `Business_${groupIndex}`;
          const businessId = business.業務id || business.id || `business_${groupIndex}`;
          
          const shift: Shift = {
            shift_date: targetDate,
            date: targetDate,
            employee_id: empId,
            business_group: business.業務グループ || 'default',
            business_master_id: businessId,
            shift_type: 'regular',
            start_time: business.開始時間 || '09:00:00',
            end_time: business.終了時間 || '17:00:00',
            status: 'scheduled',
            generation_batch_id: batchId
          };
          
          shifts.push(shift);
          assignedBusinesses++;
          
          console.log(`✅ Assigned ${empName} (${empId}) to ${businessName} with constraint validation`);
        });
        
        usedEmployees.add(empId);
      } else {
        // No available employee for this business group
        businessGroup.forEach((business) => {
          const businessName = business.業務名 || business.name || `Business_${groupIndex}`;
          unassigned_businesses.push(businessName);
          violations.push(`${businessName}: 制約条件を満たす従業員がいません`);
          console.log(`⚠️ No constraint-compliant employee for ${businessName}`);
        });
      }
    }
    
    // Log constraint violations
    if (constraintViolations.length > 0) {
      await constraintEngine.logViolations(constraintViolations, batchId);
    }
    
    const assignment_summary = {
      total_businesses: businessMasters.length,
      assigned_businesses: assignedBusinesses,
      unassigned_businesses: businessMasters.length - assignedBusinesses,
      total_employees: employees.length
    };
    
    const constraint_report = {
      total_constraints_checked: constraintEngine.getConstraintCount(),
      constraint_violations: constraintViolations.length,
      mandatory_violations: constraintViolations.filter(v => v.severity_level === 'critical').length,
      warning_violations: constraintViolations.filter(v => v.severity_level === 'warning').length
    };
    
    console.log('📊 Assignment Summary:', assignment_summary);
    console.log('📋 Constraint Report:', constraint_report);
    console.log('✅ Generated shifts:', shifts.length);
    console.log('⚠️ Violations:', violations.length);
    console.log('❌ Unassigned businesses:', unassigned_businesses.length);
    
    // Consider it successful if we assigned at least some shifts
    const isSuccessful = shifts.length > 0;
    
    return {
      success: isSuccessful,
      batch_id: batchId,
      shifts,
      violations,
      generation_time: 0.1,
      unassigned_businesses,
      assignment_summary,
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
      assignment_summary: {
        total_businesses: businessMasters?.length || 0,
        assigned_businesses: 0,
        unassigned_businesses: businessMasters?.length || 0,
        total_employees: employees?.length || 0
      },
      assigned_count: 0,
      total_businesses: businessMasters?.length || 0,
      constraint_violations: [],
      constraint_report: null
    };
  }
}

export class ShiftGenerator {
  private constraints: ShiftConstraint[] = [];
  private employees: Employee[] = [];
  private businessGroups: string[] = [];
  private skillMatrix: Map<string, string[]> = new Map(); // employee_id -> business_groups[]
  private constraintEngine: ConstraintEngine;

  constructor() {
    this.constraintEngine = new ConstraintEngine();
  }

  async initialize(): Promise<void> {
    console.log('🔄 [INIT] Starting enhanced shift generator initialization...');
    
    try {
      // Initialize constraint engine
      await this.constraintEngine.loadConstraints();
      
      // Load legacy constraints for backward compatibility
      console.log('📋 [INIT] Loading legacy constraints...');
      const { data: constraintsData, error: constraintsError } = await supabase
        .from('app_9213e72257_shift_constraints')
        .select('*')
        .eq('is_active', true);

      if (constraintsError) {
        console.error('❌ [INIT] Legacy constraints error:', constraintsError);
        // Don't throw error, continue with enhanced constraints only
      } else {
        this.constraints = constraintsData || [];
        console.log('✅ [INIT] Loaded legacy constraints:', this.constraints.length);
      }

      // Load employees
      console.log('👥 [INIT] Loading employees...');
      const { data: employeesData, error: employeesError } = await supabase
        .from('app_9213e72257_employees')
        .select('employee_id, name');

      if (employeesError) {
        console.error('❌ [INIT] Employees error:', employeesError);
        throw new Error(`従業員データの読み込みに失敗しました: ${employeesError.message}`);
      }

      this.employees = employeesData || [];
      console.log('✅ [INIT] Loaded employees:', this.employees.length, this.employees.slice(0, 3));

      if (this.employees.length === 0) {
        throw new Error('従業員データがありません。従業員を登録してください。');
      }

      // Load business groups from business_groups table
      console.log('📋 [INIT] Loading business groups from business_groups table...');
      const { data: businessGroupsData, error: bgError } = await supabase
        .from('app_9213e72257_business_groups')
        .select('name');
      
      if (!bgError && businessGroupsData && businessGroupsData.length > 0) {
        this.businessGroups = businessGroupsData.map(bg => bg.name);
        console.log('✅ [INIT] Loaded business groups from table:', this.businessGroups);
        
        // Assign all employees to all business groups (no skill restriction for now)
        this.employees.forEach(emp => {
          this.skillMatrix.set(emp.employee_id, [...this.businessGroups]);
        });
      } else {
        // Fallback: create default business groups
        console.log('⚠️ [INIT] No business groups found, using defaults');
        this.businessGroups = ['一般業務', '受付業務', '管理業務'];
        this.employees.forEach(emp => {
          this.skillMatrix.set(emp.employee_id, [...this.businessGroups]);
        });
      }
      
      console.log('✅ [INIT] Business groups:', this.businessGroups.length, this.businessGroups);
      console.log('✅ [INIT] Skill matrix initialized for', this.skillMatrix.size, 'employees');

      if (this.businessGroups.length === 0) {
        throw new Error('業務グループが設定されていません。業務グループを登録してください。');
      }

      console.log('🎉 [INIT] Enhanced initialization completed successfully');

    } catch (error) {
      console.error('❌ [INIT] Initialization failed:', error);
      throw error;
    }
  }

  async generateShifts(
    startDate: string, 
    endDate: string, 
    location?: string,
    createdBy: string = 'system'
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const batchId = uuidv4();
    
    console.log(`🚀 [GEN] Starting enhanced shift generation from ${startDate} to ${endDate}, batch: ${batchId}`);
    console.log(`📍 [GEN] Location: ${location || 'all locations'}`);

    try {
      // Load location-specific constraints
      await this.constraintEngine.loadConstraints(location);
      
      // Create generation record
      console.log('📝 [GEN] Creating generation record...');
      await this.createGenerationRecord(batchId, startDate, endDate, createdBy);

      // Generate date range
      const dates = this.generateDateRange(startDate, endDate);
      console.log('📅 [GEN] Generated dates:', dates.length, dates);

      // Get constraint values (enhanced + legacy)
      const maxConsecutiveDays = this.getConstraintValue('max_consecutive_days', 6);
      const dailyCoverage = this.getConstraintValue('daily_coverage', 1);

      console.log('📋 [GEN] Applied constraints:', { 
        maxConsecutiveDays, 
        dailyCoverage,
        enhancedConstraints: this.constraintEngine.getConstraintCount()
      });

      // Generate shifts with enhanced constraint validation
      const shifts: Shift[] = [];
      const violations: string[] = [];
      const constraintViolations: any[] = [];
      const employeeWorkDays = new Map<string, string[]>(); // employee_id -> dates[]

      // Initialize employee work tracking
      this.employees.forEach(emp => {
        employeeWorkDays.set(emp.employee_id, []);
      });

      console.log('🔄 [GEN] Starting enhanced shift assignment...');

      // For each date, assign employees to business groups with constraint validation
      for (const date of dates) {
        console.log(`📅 [GEN] Processing date: ${date}`);
        
        // For each business group, find constraint-compliant employees
        for (const businessGroup of this.businessGroups) {
          console.log(`🏢 [GEN] Processing business group: ${businessGroup}`);
          
          const availableEmployees = this.getAvailableEmployees(
            businessGroup, 
            date, 
            employeeWorkDays, 
            maxConsecutiveDays
          );

          console.log(`👥 [GEN] Available employees for ${businessGroup}: ${availableEmployees.length}`);

          if (availableEmployees.length === 0) {
            const violation = `${date}: ${businessGroup}に配置可能な従業員がいません`;
            violations.push(violation);
            console.warn(`⚠️ [GEN] ${violation}`);
            continue;
          }

          // Enhanced constraint validation for employee selection
          let selectedEmployee = null;
          let minViolationCount = Infinity;
          
          for (const employee of availableEmployees) {
            // Create test shift
            const testShift: Shift = {
              shift_date: date,
              employee_id: employee.employee_id,
              business_group: businessGroup,
              shift_type: 'regular',
              start_time: '09:00:00',
              end_time: '17:00:00',
              status: 'scheduled'
            };
            
            // Validate with enhanced constraints
            const validationResult = this.constraintEngine.validateShiftAssignment(
              {
                id: employee.employee_id,
                name: employee.name,
                location: location || '',
                employee_id: employee.employee_id
              },
              testShift,
              shifts
            );
            
            if (validationResult.canProceed && validationResult.violations.length < minViolationCount) {
              selectedEmployee = employee;
              minViolationCount = validationResult.violations.length;
              
              // If no violations, use this employee
              if (validationResult.violations.length === 0) {
                break;
              }
            }
            
            // Collect constraint violations for reporting
            constraintViolations.push(...validationResult.violations);
          }
          
          // Use the best available employee or fallback to load balancing
          if (!selectedEmployee) {
            selectedEmployee = this.selectOptimalEmployee(availableEmployees, employeeWorkDays);
          }
          
          // Create shift
          const shift: Shift = {
            shift_date: date,
            employee_id: selectedEmployee.employee_id,
            business_group: businessGroup,
            shift_type: 'regular',
            start_time: '09:00:00',
            end_time: '17:00:00',
            status: 'scheduled',
            generation_batch_id: batchId
          };

          shifts.push(shift);
          
          // Update employee work tracking
          employeeWorkDays.get(selectedEmployee.employee_id)!.push(date);
          
          console.log(`✅ [GEN] Assigned ${selectedEmployee.name} (${selectedEmployee.employee_id}) to ${businessGroup} on ${date} with enhanced constraints`);
        }
      }

      // Log constraint violations
      if (constraintViolations.length > 0) {
        await this.constraintEngine.logViolations(constraintViolations, batchId);
      }

      console.log(`📊 [GEN] Generated ${shifts.length} shifts with ${violations.length} violations and ${constraintViolations.length} constraint violations`);

      // Save shifts to database with detailed error handling
      if (shifts.length > 0) {
        console.log('💾 [SAVE] Attempting to save shifts to database...');
        console.log('💾 [SAVE] Sample shift data:', JSON.stringify(shifts[0], null, 2));
        
        try {
          const { data: insertedShifts, error: insertError } = await supabase
            .from('app_9213e72257_shifts')
            .insert(shifts.map(shift => ({
              shift_date: shift.shift_date,
              employee_id: shift.employee_id,
              business_group: shift.business_group,
              shift_type: shift.shift_type,
              start_time: shift.start_time,
              end_time: shift.end_time,
              status: shift.status,
              generation_batch_id: shift.generation_batch_id,
              created_by: createdBy
            })))
            .select();

          if (insertError) {
            console.error('❌ [SAVE] Database insert error:', insertError);
            throw new Error(`シフトの保存に失敗しました: ${insertError.message}`);
          }
          
          console.log('✅ [SAVE] Shifts saved successfully:', insertedShifts?.length || 0);
          
        } catch (saveError) {
          console.error('❌ [SAVE] Critical save error:', saveError);
          throw saveError;
        }
      } else {
        console.warn('⚠️ [SAVE] No shifts to save');
      }

      const generationTime = (Date.now() - startTime) / 1000;

      // Update generation record
      console.log('📝 [UPDATE] Updating generation record...');
      await this.updateGenerationRecord(batchId, {
        generation_status: violations.length === 0 ? 'success' : 'partial',
        total_shifts_generated: shifts.length,
        constraint_violations: violations.length + constraintViolations.length,
        generation_time_seconds: generationTime
      });

      console.log(`🎉 [GEN] Enhanced shift generation completed: ${shifts.length} shifts, ${violations.length} violations, ${constraintViolations.length} constraint violations, ${generationTime.toFixed(2)}s`);

      return {
        success: shifts.length > 0,
        batch_id: batchId,
        shifts,
        violations,
        generation_time: generationTime,
        constraint_violations: constraintViolations,
        constraint_report: {
          total_constraints_applied: this.constraintEngine.getConstraintCount(),
          constraint_violations: constraintViolations.length,
          mandatory_violations: constraintViolations.filter(v => v.severity_level === 'critical').length,
          warning_violations: constraintViolations.filter(v => v.severity_level === 'warning').length
        }
      };

    } catch (error) {
      console.error('❌ [GEN] Enhanced shift generation failed:', error);
      
      // Update generation record as failed
      await this.updateGenerationRecord(batchId, {
        generation_status: 'failed',
        generation_time_seconds: (Date.now() - startTime) / 1000
      });

      throw error;
    }
  }

  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private getConstraintValue(type: string, defaultValue: number): number {
    const constraint = this.constraints.find(c => c.constraint_type === type);
    return constraint?.constraint_value ?? defaultValue;
  }

  private getAvailableEmployees(
    businessGroup: string,
    date: string,
    employeeWorkDays: Map<string, string[]>,
    maxConsecutiveDays: number
  ): Employee[] {
    return this.employees.filter(employee => {
      // Check if employee can handle this business group
      const employeeSkills = this.skillMatrix.get(employee.employee_id) || [];
      if (employeeSkills.length > 0 && !employeeSkills.includes(businessGroup)) {
        return false;
      }

      // Check consecutive days constraint
      const workDays = employeeWorkDays.get(employee.employee_id) || [];
      if (this.wouldViolateConsecutiveDays(workDays, date, maxConsecutiveDays)) {
        return false;
      }

      return true;
    });
  }

  private wouldViolateConsecutiveDays(
    workDays: string[],
    newDate: string,
    maxConsecutiveDays: number
  ): boolean {
    if (workDays.length === 0) return false;

    // Sort work days
    const sortedDays = [...workDays, newDate].sort();
    
    // Check for consecutive days
    let consecutiveCount = 1;
    let maxConsecutive = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (dayDiff === 1) {
        consecutiveCount++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
      } else {
        consecutiveCount = 1;
      }
    }

    return maxConsecutive > maxConsecutiveDays;
  }

  private selectOptimalEmployee(
    availableEmployees: Employee[],
    employeeWorkDays: Map<string, string[]>
  ): Employee {
    // Select employee with fewest work days (load balancing)
    return availableEmployees.reduce((selected, current) => {
      const selectedWorkDays = employeeWorkDays.get(selected.employee_id)?.length || 0;
      const currentWorkDays = employeeWorkDays.get(current.employee_id)?.length || 0;
      
      return currentWorkDays < selectedWorkDays ? current : selected;
    });
  }

  private async createGenerationRecord(
    batchId: string,
    startDate: string,
    endDate: string,
    createdBy: string
  ): Promise<void> {
    console.log('📝 [RECORD] Creating enhanced generation record...');
    const { error } = await supabase
      .from('app_9213e72257_shift_generations')
      .insert({
        batch_id: batchId,
        generation_period_start: startDate,
        generation_period_end: endDate,
        generation_algorithm: 'enhanced_constraint_based',
        constraints_applied: [...this.constraints, ...this.constraintEngine.getActiveConstraints()],
        created_by: createdBy
      });

    if (error) {
      console.error('❌ [RECORD] Generation record error:', error);
      throw new Error(`生成記録の作成に失敗しました: ${error.message}`);
    }
    console.log('✅ [RECORD] Enhanced generation record created');
  }

  private async updateGenerationRecord(
    batchId: string,
    updates: {
      generation_status?: string;
      total_shifts_generated?: number;
      constraint_violations?: number;
      generation_time_seconds?: number;
    }
  ): Promise<void> {
    console.log('📝 [UPDATE] Updating generation record:', updates);
    const { error } = await supabase
      .from('app_9213e72257_shift_generations')
      .update(updates)
      .eq('batch_id', batchId);

    if (error) {
      console.error('❌ [UPDATE] Failed to update generation record:', error);
    } else {
      console.log('✅ [UPDATE] Generation record updated');
    }
  }

  async getShifts(startDate: string, endDate: string): Promise<Shift[]> {
    console.log(`📊 [LOAD] Loading shifts from ${startDate} to ${endDate}`);
    
    const { data, error } = await supabase
      .from('app_9213e72257_shifts')
      .select(`
        *,
        app_9213e72257_employees!inner(name)
      `)
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)
      .order('shift_date, employee_id');

    if (error) {
      console.error('❌ [LOAD] Error loading shifts:', error);
      throw new Error(`シフトデータの取得に失敗しました: ${error.message}`);
    }

    console.log('✅ [LOAD] Loaded shifts:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('✅ [LOAD] Sample shift:', data[0]);
    }
    return data || [];
  }

  async deleteShifts(batchId: string): Promise<void> {
    console.log(`🗑️ [DELETE] Deleting shifts for batch: ${batchId}`);
    const { error } = await supabase
      .from('app_9213e72257_shifts')
      .delete()
      .eq('generation_batch_id', batchId);

    if (error) {
      console.error('❌ [DELETE] Delete error:', error);
      throw new Error(`シフトの削除に失敗しました: ${error.message}`);
    }
    console.log('✅ [DELETE] Shifts deleted successfully');
  }
}