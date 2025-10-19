// 制約条件管理関連の型定義

export interface EnhancedConstraint {
  id: string;
  constraint_name: string;
  constraint_category: '法令遵守' | 'その他';
  constraint_type?: string;
  constraint_value: number;
  constraint_description: string;
  applicable_locations: string[];
  priority_level: number; // 0-100 (0が最高優先度・必須条件)
  enforcement_level?: 'mandatory' | 'strict' | 'flexible';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ConstraintFormData {
  constraint_name: string;
  constraint_category: '法令遵守' | 'その他';
  constraint_type?: string;
  constraint_value: number;
  constraint_description: string;
  applicable_locations: string[];
  priority_level: number;
  enforcement_level?: 'mandatory' | 'strict' | 'flexible';
  is_active: boolean;
}

export interface ConstraintViolation {
  id: string;
  constraint: EnhancedConstraint;
  employee_id: string;
  violation_date: string;
  violation_type: string;
  violation_description: string;
  severity_level: 'critical' | 'warning' | 'info';
  can_proceed: boolean;
}

export interface ConstraintValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
  canProceed: boolean;
}

// 制約タイプの定義
export const CONSTRAINT_CATEGORIES = [
  { value: '法令遵守', label: '法令遵守', description: '労働基準法等の法的要件' },
  { value: 'その他', label: 'その他', description: '会社独自のルールや運用方針' }
] as const;

export const CONSTRAINT_TYPES = [
  { value: 'max_consecutive_days', label: '最大連続出勤日数', description: '連続して出勤できる最大日数' },
  { value: 'min_rest_hours', label: '最小休息時間', description: '勤務間に必要な最小休息時間（時間）' },
  { value: 'max_weekly_hours', label: '週間最大労働時間', description: '1週間の最大労働時間（時間）' },
  { value: 'max_monthly_hours', label: '月間最大労働時間', description: '1ヶ月の最大労働時間（時間）' },
  { value: 'daily_coverage', label: '業務毎日必要人数', description: '各業務に必要な最小人数' },
  { value: 'max_shifts_per_day', label: '1日最大シフト数', description: '1人が1日に担当できる最大シフト数' }
] as const;

export const ENFORCEMENT_LEVELS = [
  { 
    value: 'mandatory', 
    label: '必須', 
    description: '違反時はシフト配置不可（法令遵守等）',
    color: 'text-red-600'
  },
  { 
    value: 'strict', 
    label: '厳格', 
    description: '違反時は警告表示（可能な限り遵守）',
    color: 'text-orange-600'
  },
  { 
    value: 'flexible', 
    label: '柔軟', 
    description: '参考程度（運用上の目安）',
    color: 'text-blue-600'
  }
] as const;

// 優先度レベルの説明
export const PRIORITY_LEVELS = {
  MANDATORY: 0,     // 必須条件（法令遵守等）
  HIGH: 1,          // 高優先度
  MEDIUM: 50,       // 中優先度（デフォルト）
  LOW: 100          // 低優先度
} as const;