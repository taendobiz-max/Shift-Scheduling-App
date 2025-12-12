// Constraint Evaluator Engine
// 制約評価エンジン

import {
  ConstraintType,
  ConstraintScope,
  EvaluationTiming,
  EnforcementLevel,
  ViolationSeverity,
  ConstraintConfig,
  ShiftData,
  EmployeeData,
  BusinessMaster,
  CalendarDate,
  ConstraintViolation,
  ConstraintEvaluationResult,
  ShiftGenerationContext,
} from './constraint-types';

/**
 * 制約評価エンジン
 */
export class ConstraintEvaluator {
  private context: ShiftGenerationContext;

  constructor(context: ShiftGenerationContext) {
    this.context = context;
  }

  /**
   * すべての制約を評価
   */
  evaluateAll(): ConstraintEvaluationResult {
    const violations: ConstraintViolation[] = [];
    const warnings: ConstraintViolation[] = [];
    const info: ConstraintViolation[] = [];

    for (const constraint of this.context.constraints) {
      if (!constraint.is_active) continue;

      const result = this.evaluateConstraint(constraint);
      
      for (const violation of result.violations) {
        if (violation.severity === ViolationSeverity.CRITICAL) {
          violations.push(violation);
        } else if (violation.severity === ViolationSeverity.WARNING) {
          warnings.push(violation);
        } else {
          info.push(violation);
        }
      }
    }

    return {
      is_valid: violations.length === 0,
      violations,
      warnings,
      info,
    };
  }

  /**
   * 個別の制約を評価
   */
  private evaluateConstraint(constraint: ConstraintConfig): ConstraintEvaluationResult {
    switch (constraint.constraint_type) {
      case ConstraintType.MAX_CONSECUTIVE_DAYS:
        return this.evaluateMaxConsecutiveDays(constraint);
      
      case ConstraintType.MONTHLY_DAYS_OFF:
        return this.evaluateMonthlyDaysOff(constraint);
      
      case ConstraintType.ALLOWANCE_BALANCE:
        return this.evaluateAllowanceBalance(constraint);
      
      case ConstraintType.DAILY_EXTRA_STAFF:
        return this.evaluateDailyExtraStaff(constraint);
      
      default:
        return { is_valid: true, violations: [], warnings: [], info: [] };
    }
  }

  /**
   * 最大連続出勤日数制約の評価
   */
  private evaluateMaxConsecutiveDays(constraint: ConstraintConfig): ConstraintEvaluationResult {
    const violations: ConstraintViolation[] = [];
    const maxDays = constraint.constraint_value;

    for (const employee of this.context.employees) {
      const employeeShifts = this.context.existing_shifts
        .filter(s => s.employee_id === employee.employee_id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let consecutiveDays = 0;
      let lastDate: Date | null = null;

      for (const shift of employeeShifts) {
        const currentDate = new Date(shift.date);
        
        if (lastDate) {
          const dayDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 1) {
            consecutiveDays++;
            if (consecutiveDays > maxDays) {
              violations.push({
                constraint_id: constraint.id,
                constraint_name: constraint.constraint_name,
                constraint_type: constraint.constraint_type,
                violation_type: 'max_consecutive_days_exceeded',
                violation_description: `${employee.name}が${consecutiveDays}日連続で出勤しています（最大${maxDays}日）`,
                severity: this.getSeverity(constraint.enforcement_level),
                employee_id: employee.employee_id,
                employee_name: employee.name,
                date: shift.date,
                actual_value: consecutiveDays,
                expected_value: maxDays,
              });
            }
          } else {
            consecutiveDays = 1;
          }
        } else {
          consecutiveDays = 1;
        }
        
        lastDate = currentDate;
      }
    }

    return {
      is_valid: violations.length === 0,
      violations,
      warnings: [],
      info: [],
    };
  }

  /**
   * 月間休暇日数制約の評価
   */
  private evaluateMonthlyDaysOff(constraint: ConstraintConfig): ConstraintEvaluationResult {
    const violations: ConstraintViolation[] = [];
    const minDaysOff = constraint.condition_rules.min_required || constraint.constraint_value;

    // 対象期間の日数を計算
    const startDate = new Date(this.context.start_date);
    const endDate = new Date(this.context.end_date);
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (const employee of this.context.employees) {
      const employeeShifts = this.context.existing_shifts
        .filter(s => s.employee_id === employee.employee_id);
      
      const workDays = employeeShifts.length;
      const daysOff = totalDays - workDays;

      if (daysOff < minDaysOff) {
        violations.push({
          constraint_id: constraint.id,
          constraint_name: constraint.constraint_name,
          constraint_type: constraint.constraint_type,
          violation_type: 'insufficient_days_off',
          violation_description: `${employee.name}の休暇日数が${daysOff}日で、最低${minDaysOff}日に達していません`,
          severity: this.getSeverity(constraint.enforcement_level),
          employee_id: employee.employee_id,
          employee_name: employee.name,
          actual_value: daysOff,
          expected_value: minDaysOff,
        });
      }
    }

    return {
      is_valid: violations.length === 0,
      violations,
      warnings: [],
      info: [],
    };
  }

  /**
   * 手当付き業務の均等配分制約の評価
   */
  private evaluateAllowanceBalance(constraint: ConstraintConfig): ConstraintEvaluationResult {
    const violations: ConstraintViolation[] = [];
    const maxDifference = constraint.condition_rules.max_difference || constraint.constraint_value;

    // 手当付き業務を取得
    const allowanceBusinesses = this.context.businesses
      .filter(b => b.has_allowance === true);

    if (allowanceBusinesses.length === 0) {
      return { is_valid: true, violations: [], warnings: [], info: [] };
    }

    // 従業員ごとの手当付き業務の割り当て数をカウント
    const employeeAllowanceCounts = new Map<string, number>();
    
    for (const employee of this.context.employees) {
      const count = this.context.existing_shifts.filter(s => {
        if (s.employee_id !== employee.employee_id) return false;
        const business = allowanceBusinesses.find(b => b.業務id === s.business_master_id);
        return business !== undefined;
      }).length;
      
      employeeAllowanceCounts.set(employee.employee_id, count);
    }

    // 最大値と最小値の差を計算
    const counts = Array.from(employeeAllowanceCounts.values());
    if (counts.length === 0) {
      return { is_valid: true, violations: [], warnings: [], info: [] };
    }

    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const difference = maxCount - minCount;

    if (difference > maxDifference) {
      // 最大値を持つ従業員と最小値を持つ従業員を特定
      const maxEmployees = this.context.employees.filter(e => 
        employeeAllowanceCounts.get(e.employee_id) === maxCount
      );
      const minEmployees = this.context.employees.filter(e => 
        employeeAllowanceCounts.get(e.employee_id) === minCount
      );

      violations.push({
        constraint_id: constraint.id,
        constraint_name: constraint.constraint_name,
        constraint_type: constraint.constraint_type,
        violation_type: 'allowance_imbalance',
        violation_description: `手当付き業務の割り当てに偏りがあります。最大${maxCount}回（${maxEmployees.map(e => e.name).join(', ')}）、最小${minCount}回（${minEmployees.map(e => e.name).join(', ')}）、差${difference}回（許容${maxDifference}回）`,
        severity: this.getSeverity(constraint.enforcement_level),
        actual_value: difference,
        expected_value: maxDifference,
      });
    }

    return {
      is_valid: violations.length === 0,
      violations,
      warnings: [],
      info: [],
    };
  }

  /**
   * 友引の日の出勤人数制約の評価
   */
  private evaluateDailyExtraStaff(constraint: ConstraintConfig): ConstraintEvaluationResult {
    const violations: ConstraintViolation[] = [];
    const tomobikiExtra = constraint.condition_rules.tomobiki_extra || 5;
    const normalExtra = constraint.condition_rules.normal_extra || 10;

    // 対象期間の各日付をチェック
    const startDate = new Date(this.context.start_date);
    const endDate = new Date(this.context.end_date);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      // カレンダー情報を取得
      const calendarDate = this.context.calendar_dates.find(cd => cd.date === dateStr);
      const isTomobiki = calendarDate?.is_tomobiki || false;
      const requiredExtra = isTomobiki ? tomobikiExtra : normalExtra;

      // その日のシフトが割り当てられている従業員数
      const assignedEmployees = new Set(
        this.context.existing_shifts
          .filter(s => s.date === dateStr)
          .map(s => s.employee_id)
      );

      // 未アサインの従業員数
      const unassignedCount = this.context.employees.length - assignedEmployees.size;

      if (unassignedCount < requiredExtra) {
        violations.push({
          constraint_id: constraint.id,
          constraint_name: constraint.constraint_name,
          constraint_type: constraint.constraint_type,
          violation_type: 'insufficient_extra_staff',
          violation_description: `${dateStr}は${isTomobiki ? '友引' : '通常日'}で、未アサイン${requiredExtra}名必要ですが、${unassignedCount}名しかいません`,
          severity: this.getSeverity(constraint.enforcement_level),
          date: dateStr,
          actual_value: unassignedCount,
          expected_value: requiredExtra,
        });
      }
    }

    return {
      is_valid: violations.length === 0,
      violations,
      warnings: [],
      info: [],
    };
  }

  /**
   * 強制レベルから違反の深刻度を取得
   */
  private getSeverity(enforcementLevel: EnforcementLevel): ViolationSeverity {
    switch (enforcementLevel) {
      case EnforcementLevel.MANDATORY:
        return ViolationSeverity.CRITICAL;
      case EnforcementLevel.STRICT:
        return ViolationSeverity.WARNING;
      case EnforcementLevel.FLEXIBLE:
        return ViolationSeverity.INFO;
      default:
        return ViolationSeverity.WARNING;
    }
  }
}
