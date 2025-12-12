// Constraint Types and Interfaces for Shift Generation
// 制約条件の型定義とインターフェース

/**
 * 制約タイプの列挙型
 */
export enum ConstraintType {
  // 既存の制約タイプ
  MAX_CONSECUTIVE_DAYS = 'max_consecutive_days',
  MIN_REST_HOURS = 'min_rest_hours',
  MAX_WEEKLY_HOURS = 'max_weekly_hours',
  MAX_MONTHLY_HOURS = 'max_monthly_hours',
  DAILY_COVERAGE = 'daily_coverage',
  MAX_SHIFTS_PER_DAY = 'max_shifts_per_day',
  
  // 新しい制約タイプ
  MONTHLY_DAYS_OFF = 'monthly_days_off',
  ALLOWANCE_BALANCE = 'allowance_balance',
  DAILY_EXTRA_STAFF = 'daily_extra_staff',
}

/**
 * 制約のスコープ
 */
export enum ConstraintScope {
  EMPLOYEE = 'employee',
  BUSINESS = 'business',
  DATE = 'date',
  OFFICE = 'office',
  GLOBAL = 'global',
}

/**
 * 制約の評価タイミング
 */
export enum EvaluationTiming {
  PRE_ASSIGNMENT = 'pre_assignment',
  POST_GENERATION = 'post_generation',
  CUMULATIVE = 'cumulative',
}

/**
 * 制約の強制レベル
 */
export enum EnforcementLevel {
  MANDATORY = 'mandatory',
  STRICT = 'strict',
  FLEXIBLE = 'flexible',
}

/**
 * 違反の深刻度
 */
export enum ViolationSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * 制約条件の設定
 */
export interface ConstraintConfig {
  id: string;
  constraint_name: string;
  constraint_category: '法令遵守' | 'その他';
  constraint_type: ConstraintType;
  constraint_value: number;
  constraint_description: string;
  applicable_locations: string[];
  priority_level: number;
  enforcement_level: EnforcementLevel;
  constraint_scope: ConstraintScope;
  evaluation_timing: EvaluationTiming;
  condition_rules: ConditionRules;
  calculation_formula?: CalculationFormula;
  is_active: boolean;
}

/**
 * 制約の条件ルール
 */
export interface ConditionRules {
  // 月間休暇日数制約
  calculation?: 'count_days_without_shift';
  period?: 'monthly' | 'weekly';
  min_required?: number;
  
  // 手当付き業務の均等配分制約
  business_filter?: string;
  balance_type?: 'count' | 'hours';
  max_difference?: number;
  
  // 友引の日の出勤人数制約
  tomobiki_extra?: number;
  normal_extra?: number;
  date_type_field?: string;
  
  // その他の条件（拡張可能）
  [key: string]: any;
}

/**
 * 制約の計算式
 */
export interface CalculationFormula {
  calculate: string;
  condition: string;
  [key: string]: any;
}

/**
 * シフトデータ
 */
export interface ShiftData {
  id: string;
  date: string;
  employee_id: string;
  employee_name?: string;
  business_master_id: string;
  business_name?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
}

/**
 * 従業員データ
 */
export interface EmployeeData {
  employee_id: string;
  name: string;
  office?: string;
  display_order?: number;
}

/**
 * 業務マスタデータ
 */
export interface BusinessMaster {
  業務id: string;
  業務名: string;
  開始時刻?: string;
  終了時刻?: string;
  拠点?: string;
  has_allowance?: boolean;
  allowance_amount?: number;
}

/**
 * カレンダー日付データ
 */
export interface CalendarDate {
  id: string;
  date: string;
  is_tomobiki: boolean;
  is_holiday: boolean;
  holiday_name?: string;
  notes?: string;
}

/**
 * 制約違反
 */
export interface ConstraintViolation {
  constraint_id: string;
  constraint_name: string;
  constraint_type: ConstraintType;
  violation_type: string;
  violation_description: string;
  severity: ViolationSeverity;
  employee_id?: string;
  employee_name?: string;
  date?: string;
  business_id?: string;
  business_name?: string;
  actual_value?: number;
  expected_value?: number;
}

/**
 * 制約評価結果
 */
export interface ConstraintEvaluationResult {
  is_valid: boolean;
  violations: ConstraintViolation[];
  warnings: ConstraintViolation[];
  info: ConstraintViolation[];
}

/**
 * シフト生成コンテキスト
 */
export interface ShiftGenerationContext {
  start_date: string;
  end_date: string;
  office: string;
  employees: EmployeeData[];
  businesses: BusinessMaster[];
  existing_shifts: ShiftData[];
  calendar_dates: CalendarDate[];
  constraints: ConstraintConfig[];
}
