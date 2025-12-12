// Generic Constraint Evaluation Engine
// データ駆動型の制約評価システム

import { v4 as uuidv4 } from 'uuid';
import { EnhancedConstraint, ConstraintViolation } from '@/types/constraint';

// 計算コンテキスト - 制約評価に必要なデータ
export interface EvaluationContext {
  employee: {
    id: string;
    name: string;
    location: string;
    employee_id?: string;
  };
  proposedShift: {
    id?: string;
    shift_date: string;
    employee_id: string;
    business_id?: string;
    business_group: string;
    start_time: string;
    end_time: string;
    location?: string;
  };
  existingShifts: Array<{
    id?: string;
    shift_date: string;
    employee_id: string;
    business_id?: string;
    business_group: string;
    start_time: string;
    end_time: string;
    location?: string;
  }>;
  allEmployees?: Array<{
    id: string;
    name: string;
    location: string;
  }>;
  businessMasters?: Array<{
    業務id: string;
    業務名: string;
    開始時間: string;
    終了時間: string;
    required_staff_count?: number;
  }>;
  calendarDates?: Array<{
    date: string;
    is_tomobiki: boolean;
    is_holiday: boolean;
  }>;
}

// 計算関数の型定義
export type CalculationFunction = (context: EvaluationContext, params: any) => number | boolean | string;

// 計算関数ライブラリ
export class CalculationLibrary {
  private functions: Map<string, CalculationFunction> = new Map();

  constructor() {
    this.registerDefaultFunctions();
  }

  /**
   * デフォルトの計算関数を登録
   */
  private registerDefaultFunctions(): void {
    // 連続出勤日数を計算
    this.register('count_consecutive_days', (context) => {
      const { employee, proposedShift, existingShifts } = context;
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
      
      return maxConsecutive;
    });

    // 月間休暇日数を計算
    this.register('count_days_off_in_month', (context) => {
      const { employee, proposedShift, existingShifts } = context;
      const targetMonth = proposedShift.shift_date.substring(0, 7); // YYYY-MM
      
      // 対象月の全日付を生成
      const year = parseInt(targetMonth.split('-')[0]);
      const month = parseInt(targetMonth.split('-')[1]);
      const daysInMonth = new Date(year, month, 0).getDate();
      const allDatesInMonth = Array.from({ length: daysInMonth }, (_, i) => {
        const day = String(i + 1).padStart(2, '0');
        return `${targetMonth}-${day}`;
      });
      
      // 勤務日を取得
      const employeeShifts = existingShifts.filter(
        s => s.employee_id === employee.id && s.shift_date.startsWith(targetMonth)
      );
      const workDates = new Set([
        ...employeeShifts.map(s => s.shift_date),
        proposedShift.shift_date
      ]);
      
      // 休暇日数 = 全日数 - 勤務日数
      return allDatesInMonth.length - workDates.size;
    });

    // 勤務間インターバルを計算（時間）
    this.register('calculate_rest_hours', (context) => {
      const { employee, proposedShift, existingShifts } = context;
      const employeeShifts = existingShifts.filter(s => s.employee_id === employee.id);
      
      if (employeeShifts.length === 0) return 999; // 初回シフトは問題なし
      
      // 提案シフトの前後のシフトを確認
      const proposedStart = new Date(`${proposedShift.shift_date}T${proposedShift.start_time}`);
      
      let minRestHours = 999;
      
      for (const shift of employeeShifts) {
        const shiftEnd = new Date(`${shift.shift_date}T${shift.end_time}`);
        const restHours = (proposedStart.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60);
        
        if (restHours > 0 && restHours < minRestHours) {
          minRestHours = restHours;
        }
      }
      
      return minRestHours;
    });

    // 週間労働時間を計算
    this.register('calculate_weekly_hours', (context) => {
      const { employee, proposedShift, existingShifts } = context;
      const proposedDate = new Date(proposedShift.shift_date);
      const weekStart = new Date(proposedDate);
      weekStart.setDate(proposedDate.getDate() - proposedDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const employeeShifts = existingShifts.filter(s => {
        const shiftDate = new Date(s.shift_date);
        return s.employee_id === employee.id && shiftDate >= weekStart && shiftDate <= weekEnd;
      });
      
      let totalHours = 0;
      
      for (const shift of employeeShifts) {
        const start = new Date(`${shift.shift_date}T${shift.start_time}`);
        const end = new Date(`${shift.shift_date}T${shift.end_time}`);
        totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
      
      // 提案シフトの時間を追加
      const proposedStart = new Date(`${proposedShift.shift_date}T${proposedShift.start_time}`);
      const proposedEnd = new Date(`${proposedShift.shift_date}T${proposedShift.end_time}`);
      totalHours += (proposedEnd.getTime() - proposedStart.getTime()) / (1000 * 60 * 60);
      
      return totalHours;
    });

    // 月間労働時間を計算
    this.register('calculate_monthly_hours', (context) => {
      const { employee, proposedShift, existingShifts } = context;
      const targetMonth = proposedShift.shift_date.substring(0, 7);
      
      const employeeShifts = existingShifts.filter(
        s => s.employee_id === employee.id && s.shift_date.startsWith(targetMonth)
      );
      
      let totalHours = 0;
      
      for (const shift of employeeShifts) {
        const start = new Date(`${shift.shift_date}T${shift.start_time}`);
        const end = new Date(`${shift.shift_date}T${shift.end_time}`);
        totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
      
      // 提案シフトの時間を追加
      const proposedStart = new Date(`${proposedShift.shift_date}T${proposedShift.start_time}`);
      const proposedEnd = new Date(`${proposedShift.shift_date}T${proposedShift.end_time}`);
      totalHours += (proposedEnd.getTime() - proposedStart.getTime()) / (1000 * 60 * 60);
      
      return totalHours;
    });

    // 1日のシフト数を計算
    this.register('count_shifts_on_date', (context) => {
      const { employee, proposedShift, existingShifts } = context;
      const shiftsOnDate = existingShifts.filter(
        s => s.employee_id === employee.id && s.shift_date === proposedShift.shift_date
      );
      return shiftsOnDate.length + 1; // +1 for proposed shift
    });

    // 友引かどうかを判定
    this.register('is_tomobiki', (context) => {
      const { proposedShift, calendarDates } = context;
      if (!calendarDates) return false;
      
      const dateInfo = calendarDates.find(d => d.date === proposedShift.shift_date);
      return dateInfo?.is_tomobiki || false;
    });

    // 未アサイン従業員数を計算
    this.register('count_unassigned_employees', (context) => {
      const { proposedShift, existingShifts, allEmployees } = context;
      if (!allEmployees) return 0;
      
      const assignedEmployees = new Set(
        existingShifts
          .filter(s => s.shift_date === proposedShift.shift_date)
          .map(s => s.employee_id)
      );
      
      return allEmployees.length - assignedEmployees.size;
    });

    // 業務の必要人数を取得
    this.register('get_required_staff_count', (context) => {
      const { proposedShift, businessMasters } = context;
      if (!businessMasters || !proposedShift.business_id) return 1;
      
      const business = businessMasters.find(b => b.業務id === proposedShift.business_id);
      return business?.required_staff_count || 1;
    });

    // 業務に割り当てられた従業員数を計算
    this.register('count_assigned_to_business', (context) => {
      const { proposedShift, existingShifts } = context;
      const assignedCount = existingShifts.filter(
        s => s.shift_date === proposedShift.shift_date && 
             s.business_id === proposedShift.business_id
      ).length;
      return assignedCount + 1; // +1 for proposed shift
    });
  }

  /**
   * 計算関数を登録
   */
  register(name: string, func: CalculationFunction): void {
    this.functions.set(name, func);
  }

  /**
   * 計算関数を実行
   */
  execute(name: string, context: EvaluationContext, params?: any): number | boolean | string {
    const func = this.functions.get(name);
    if (!func) {
      console.warn(`⚠️ [CALC] Unknown calculation function: ${name}`);
      return 0;
    }
    
    try {
      return func(context, params);
    } catch (error) {
      console.error(`❌ [CALC] Error executing function ${name}:`, error);
      return 0;
    }
  }

  /**
   * 登録されている関数の一覧を取得
   */
  listFunctions(): string[] {
    return Array.from(this.functions.keys());
  }
}

/**
 * 汎用的な制約評価エンジン
 */
export class GenericConstraintEngine {
  private calcLib: CalculationLibrary;

  constructor() {
    this.calcLib = new CalculationLibrary();
  }

  /**
   * 制約を評価
   */
  evaluate(
    constraint: EnhancedConstraint,
    context: EvaluationContext
  ): ConstraintViolation | null {
    console.log(`🔍 [GENERIC] Evaluating constraint: ${constraint.constraint_name}`);

    // calculation_formulaが存在しない場合はスキップ
    if (!constraint.calculation_formula || typeof constraint.calculation_formula !== 'object') {
      console.warn(`⚠️ [GENERIC] No calculation_formula for constraint: ${constraint.constraint_name}`);
      return null;
    }

    const formula = constraint.calculation_formula as any;

    // 計算関数を実行
    const functionName = formula.function;
    if (!functionName) {
      console.warn(`⚠️ [GENERIC] No function specified in formula for: ${constraint.constraint_name}`);
      return null;
    }

    const calculatedValue = this.calcLib.execute(functionName, context, formula.params);
    const threshold = formula.threshold || constraint.constraint_value;
    const operator = formula.operator || '<=';

    console.log(`📊 [GENERIC] ${constraint.constraint_name}: calculated=${calculatedValue}, threshold=${threshold}, operator=${operator}`);

    // 比較演算子で評価
    const isViolated = this.compareValues(calculatedValue, operator, threshold);

    if (isViolated) {
      return {
        id: uuidv4(),
        constraint,
        employee_id: context.employee.id,
        violation_date: context.proposedShift.shift_date,
        violation_type: constraint.constraint_type,
        violation_description: this.generateViolationMessage(
          constraint,
          context.employee.name,
          calculatedValue,
          threshold,
          operator
        ),
        severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
        can_proceed: constraint.enforcement_level !== 'mandatory'
      };
    }

    return null;
  }

  /**
   * 値を比較
   */
  private compareValues(value: any, operator: string, threshold: any): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      case '==':
      case '===':
        return value === threshold;
      case '!=':
      case '!==':
        return value !== threshold;
      default:
        console.warn(`⚠️ [GENERIC] Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * 違反メッセージを生成
   */
  private generateViolationMessage(
    constraint: EnhancedConstraint,
    employeeName: string,
    calculatedValue: any,
    threshold: any,
    operator: string
  ): string {
    const operatorText: Record<string, string> = {
      '>': '超過',
      '>=': '以上',
      '<': '未満',
      '<=': '以下',
      '==': '一致',
      '!=': '不一致'
    };

    return `${employeeName}の${constraint.constraint_name}が${calculatedValue}となり、基準値${threshold}を${operatorText[operator] || '違反'}しています`;
  }

  /**
   * 計算ライブラリを取得（カスタム関数を追加する場合）
   */
  getCalculationLibrary(): CalculationLibrary {
    return this.calcLib;
  }
}
