import { v4 as uuidv4 } from 'uuid';
import { ConstraintManager } from './constraintManager';

// Type definitions
export interface EnhancedConstraint {
  id: string;
  constraint_name: string;
  constraint_type: string;
  priority_level: number;
  enforcement_level: string;
  is_active: boolean;
  [key: string]: any;
}

export interface ConstraintViolation {
  id?: string;
  constraint_id: string;
  constraint_name: string;
  violation_description: string;
  severity: string;
  constraint?: any;
  [key: string]: any;
}

export interface ConstraintValidationResult {
  canProceed: boolean;
  violations: ConstraintViolation[];
}

interface Employee {
  id: string;
  name: string;
  location: string;
  employee_id?: string;
}

interface Shift {
  id?: string;
  shift_date: string;
  employee_id: string;
  business_group: string;
  start_time: string;
  end_time: string;
  location?: string;
}

export class ConstraintEngine {
  private constraints: EnhancedConstraint[] = [];
  private violationLog: ConstraintViolation[] = [];
  private cachedConstraintGroups: any[] | null = null;

  /**
   * 指定拠点の制約条件を読み込み
   */
  async loadConstraints(location?: string): Promise<void> {
    console.log('🔄 [CONSTRAINT] Loading constraints for location:', location);
    
    try {
      if (location) {
        this.constraints = await ConstraintManager.getActiveConstraintsByLocation(location);
      } else {
        const allConstraints = await ConstraintManager.getAllConstraints();
        this.constraints = allConstraints.filter(c => c.is_active);
      }

      console.log('✅ [CONSTRAINT] Loaded constraints:', this.constraints.length);
      console.log('📋 [CONSTRAINT] Constraint summary:', this.getConstraintSummary());
      
    } catch (error) {
      console.error('❌ [CONSTRAINT] Failed to load constraints:', error);
      // テーブルが存在しない場合は空の配列で続行
      this.constraints = [];
    }
  }

  /**
   * シフト配置の制約チェック（制約グループを含む）
   */
  async validateShiftAssignment(
    employee: Employee,
    proposedShift: Shift,
    existingShifts: Shift[]
  ): Promise<ConstraintValidationResult> {
    const violations: ConstraintViolation[] = [];
    let canProceed = true;
    
    console.log(`🔍 [VALIDATE] Checking constraints for ${employee.name} on ${proposedShift.shift_date}`);

    // 優先度順に制約をチェック
    for (const constraint of this.constraints) {
      const violation = this.checkConstraint(constraint, employee, proposedShift, existingShifts);
      
      if (violation) {
        violations.push(violation);
        console.log(`⚠️ [VALIDATE] Constraint violation: ${violation.violation_description}`);
        
        // 必須制約(priority_level = 0, enforcement_level = 'mandatory')の場合は配置不可
        if (constraint.priority_level === 0 && constraint.enforcement_level === 'mandatory') {
          canProceed = false;
          console.log(`🚫 [VALIDATE] Mandatory constraint violated, assignment blocked`);
          break;
        }
      }
    }

    // 制約グループの評価は現在無効化（constraintGroupEvaluatorが存在しないため）
    // TODO: 制約グループ機能を実装する場合は、constraintGroupEvaluator.tsを作成してください

    return {
      canProceed,
      violations
    };
  }

  /**
   * 個別制約のチェック
   */
  private checkConstraint(
    constraint: EnhancedConstraint,
    employee: Employee,
    proposedShift: Shift,
    existingShifts: Shift[]
  ): ConstraintViolation | null {
    switch (constraint.constraint_type) {
      case 'max_consecutive_days':
        return this.checkMaxConsecutiveDays(constraint, employee, proposedShift, existingShifts);
      case 'min_rest_hours':
        return this.checkMinRestHours(constraint, employee, proposedShift, existingShifts);
      case 'max_weekly_hours':
        return this.checkMaxWeeklyHours(constraint, employee, proposedShift, existingShifts);
      case 'max_monthly_hours':
        return this.checkMaxMonthlyHours(constraint, employee, proposedShift, existingShifts);
      case 'daily_coverage':
        // 日次カバレッジは個別従業員ではなく業務全体でチェック
        return null;
      case 'max_shifts_per_day':
        return this.checkMaxShiftsPerDay(constraint, employee, proposedShift, existingShifts);
      default:
        console.warn(`⚠️ [CONSTRAINT] Unknown constraint type: ${constraint.constraint_type}`);
        return null;
    }
  }

  /**
   * 最大連続出勤日数チェック
   */
  private checkMaxConsecutiveDays(
    constraint: EnhancedConstraint,
    employee: Employee,
    proposedShift: Shift,
    existingShifts: Shift[]
  ): ConstraintViolation | null {
    const employeeShifts = existingShifts.filter(s => s.employee_id === employee.id);
    const allDates = [...employeeShifts.map(s => s.shift_date), proposedShift.shift_date].sort();
    
    let consecutiveCount = 1;
    let maxConsecutive = 1;
    
    for (let i = 1; i < allDates.length; i++) {
      const prevDate = new Date(allDates[i - 1]);
      const currDate = new Date(allDates[i]);
      const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        consecutiveCount++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
      } else {
        consecutiveCount = 1;
      }
    }
    
    if (maxConsecutive > constraint.constraint_value) {
      return {
        id: uuidv4(),
        constraint,
        employee_id: employee.id,
        violation_date: proposedShift.shift_date,
        violation_type: 'max_consecutive_days',
        violation_description: `${employee.name}の連続出勤日数が${maxConsecutive}日となり、上限${constraint.constraint_value}日を超過`,
        severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
        can_proceed: constraint.enforcement_level !== 'mandatory'
      };
    }
    
    return null;
  }

  /**
   * 最小休息時間チェック
   */
  private checkMinRestHours(
    constraint: EnhancedConstraint,
    employee: Employee,
    proposedShift: Shift,
    existingShifts: Shift[]
  ): ConstraintViolation | null {
    const employeeShifts = existingShifts.filter(s => s.employee_id === employee.id);
    const proposedDate = new Date(proposedShift.shift_date);
    
    // 前日のシフトをチェック
    const previousDay = new Date(proposedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDayStr = previousDay.toISOString().split('T')[0];
    
    const previousShift = employeeShifts.find(s => s.shift_date === previousDayStr);
    
    if (previousShift) {
      const previousEndTime = new Date(`${previousShift.shift_date} ${previousShift.end_time}`);
      const proposedStartTime = new Date(`${proposedShift.shift_date} ${proposedShift.start_time}`);
      
      const restHours = (proposedStartTime.getTime() - previousEndTime.getTime()) / (1000 * 60 * 60);
      
      if (restHours < constraint.constraint_value) {
        return {
          id: uuidv4(),
          constraint,
          employee_id: employee.id,
          violation_date: proposedShift.shift_date,
          violation_type: 'min_rest_hours',
          violation_description: `${employee.name}の勤務間休息時間が${restHours.toFixed(1)}時間で、最小必要時間${constraint.constraint_value}時間を下回る`,
          severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
          can_proceed: constraint.enforcement_level !== 'mandatory'
        };
      }
    }
    
    return null;
  }

  /**
   * 週間最大労働時間チェック
   */
  private checkMaxWeeklyHours(
    constraint: EnhancedConstraint,
    employee: Employee,
    proposedShift: Shift,
    existingShifts: Shift[]
  ): ConstraintViolation | null {
    const proposedDate = new Date(proposedShift.shift_date);
    const weekStart = new Date(proposedDate);
    weekStart.setDate(proposedDate.getDate() - proposedDate.getDay());
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekShifts = existingShifts.filter(s => 
      s.employee_id === employee.id &&
      new Date(s.shift_date) >= weekStart &&
      new Date(s.shift_date) <= weekEnd
    );
    
    let totalWeeklyHours = this.calculateShiftHours(weekShifts);
    totalWeeklyHours += this.calculateShiftHours([proposedShift]);
    
    if (totalWeeklyHours > constraint.constraint_value) {
      return {
        id: uuidv4(),
        constraint,
        employee_id: employee.id,
        violation_date: proposedShift.shift_date,
        violation_type: 'max_weekly_hours',
        violation_description: `${employee.name}の週間労働時間が${totalWeeklyHours.toFixed(1)}時間となり、上限${constraint.constraint_value}時間を超過`,
        severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
        can_proceed: constraint.enforcement_level !== 'mandatory'
      };
    }
    
    return null;
  }

  /**
   * 月間最大労働時間チェック
   */
  private checkMaxMonthlyHours(
    constraint: EnhancedConstraint,
    employee: Employee,
    proposedShift: Shift,
    existingShifts: Shift[]
  ): ConstraintViolation | null {
    const proposedDate = new Date(proposedShift.shift_date);
    const monthStart = new Date(proposedDate.getFullYear(), proposedDate.getMonth(), 1);
    const monthEnd = new Date(proposedDate.getFullYear(), proposedDate.getMonth() + 1, 0);
    
    const monthShifts = existingShifts.filter(s => 
      s.employee_id === employee.id &&
      new Date(s.shift_date) >= monthStart &&
      new Date(s.shift_date) <= monthEnd
    );
    
    let totalMonthlyHours = this.calculateShiftHours(monthShifts);
    totalMonthlyHours += this.calculateShiftHours([proposedShift]);
    
    if (totalMonthlyHours > constraint.constraint_value) {
      return {
        id: uuidv4(),
        constraint,
        employee_id: employee.id,
        violation_date: proposedShift.shift_date,
        violation_type: 'max_monthly_hours',
        violation_description: `${employee.name}の月間労働時間が${totalMonthlyHours.toFixed(1)}時間となり、上限${constraint.constraint_value}時間を超過`,
        severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
        can_proceed: constraint.enforcement_level !== 'mandatory'
      };
    }
    
    return null;
  }

  /**
   * 1日最大シフト数チェック
   */
  private checkMaxShiftsPerDay(
    constraint: EnhancedConstraint,
    employee: Employee,
    proposedShift: Shift,
    existingShifts: Shift[]
  ): ConstraintViolation | null {
    const sameDayShifts = existingShifts.filter(s => 
      s.employee_id === employee.id && s.shift_date === proposedShift.shift_date
    );
    
    const totalShiftsForDay = sameDayShifts.length + 1; // +1 for proposed shift
    
    if (totalShiftsForDay > constraint.constraint_value) {
      return {
        id: uuidv4(),
        constraint,
        employee_id: employee.id,
        violation_date: proposedShift.shift_date,
        violation_type: 'max_shifts_per_day',
        violation_description: `${employee.name}の${proposedShift.shift_date}のシフト数が${totalShiftsForDay}となり、上限${constraint.constraint_value}を超過`,
        severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
        can_proceed: constraint.enforcement_level !== 'mandatory'
      };
    }
    
    return null;
  }

  /**
   * シフトの労働時間を計算
   */
  private calculateShiftHours(shifts: Shift[]): number {
    return shifts.reduce((total, shift) => {
      const startTime = new Date(`2000-01-01 ${shift.start_time}`);
      const endTime = new Date(`2000-01-01 ${shift.end_time}`);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      return total + Math.max(0, hours); // 負の値を避ける
    }, 0);
  }

  /**
   * 制約条件サマリーを取得
   */
  private getConstraintSummary(): object {
    const summary = {
      total: this.constraints.length,
      byCategory: {} as Record<string, number>,
      byEnforcement: {} as Record<string, number>,
      byPriority: {
        mandatory: 0, // priority_level = 0
        high: 0,      // priority_level 1-20
        medium: 0,    // priority_level 21-50
        low: 0        // priority_level 51-100
      }
    };
    
    this.constraints.forEach(constraint => {
      // カテゴリ別
      summary.byCategory[constraint.constraint_category] = 
        (summary.byCategory[constraint.constraint_category] || 0) + 1;
      
      // 強制レベル別
      summary.byEnforcement[constraint.enforcement_level] = 
        (summary.byEnforcement[constraint.enforcement_level] || 0) + 1;
      
      // 優先度別
      if (constraint.priority_level === 0) {
        summary.byPriority.mandatory++;
      } else if (constraint.priority_level <= 20) {
        summary.byPriority.high++;
      } else if (constraint.priority_level <= 50) {
        summary.byPriority.medium++;
      } else {
        summary.byPriority.low++;
      }
    });
    
    return summary;
  }

  /**
   * 制約違反をログに記録
   */
  async logViolations(violations: ConstraintViolation[], batchId: string): Promise<void> {
    if (violations.length === 0) return;
    
    try {
      await ConstraintManager.logViolations(violations, batchId);
    } catch (error) {
      console.error('❌ [LOG] Error logging violations:', error);
    }
  }

  /**
   * 制約条件の数を取得
   */
  getConstraintCount(): number {
    return this.constraints.length;
  }

  /**
   * 有効な制約条件を取得
   */
  getActiveConstraints(): EnhancedConstraint[] {
    return this.constraints.filter(c => c.is_active);
  }
}

// 制約エンジンのシングルトンインスタンス
export const constraintEngine = new ConstraintEngine();