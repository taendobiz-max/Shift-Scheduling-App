/**
 * 統合シフトルールシステムの型定義
 */

/**
 * ルールタイプ
 */
export type RuleType = 
  | 'constraint'    // 制約条件
  | 'filter'        // フィルター
  | 'assignment'    // 割り当てロジック
  | 'validation'    // 検証
  | 'optimization'; // 最適化

/**
 * 強制レベル
 */
export type EnforcementLevel = 
  | 'mandatory'    // 必須
  | 'recommended'  // 推奨
  | 'optional';    // オプション

/**
 * 統合ルール
 */
export interface UnifiedRule {
  id: string;
  rule_name: string;
  rule_category: string;
  description?: string;
  
  // 適用範囲
  applicable_locations: string[];
  applicable_business_groups?: string[];
  applicable_employees?: string[];
  
  // ルールタイプ
  rule_type: RuleType;
  
  // ルール設定（JSON）
  rule_config: RuleConfig;
  
  // 優先度・強制レベル
  priority_level: number;  // 0-10
  enforcement_level: EnforcementLevel;
  
  // 状態
  is_active: boolean;
  
  // メタデータ
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

/**
 * ルール設定（基底型）
 */
export interface RuleConfig {
  [key: string]: any;
}

/**
 * 制約条件のルール設定
 */
export interface ConstraintRuleConfig extends RuleConfig {
  constraint_type: string;
  value: number | string;
  unit?: string;
  scope?: 'employee' | 'shift' | 'day' | 'week' | 'month';
}

/**
 * フィルターのルール設定
 */
export interface FilterRuleConfig extends RuleConfig {
  filter_type: string;
  conditions: FilterCondition[];
}

export interface FilterCondition {
  field: string;
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'not_in' | 'contains';
  value: any;
}

/**
 * 割り当てロジックのルール設定
 */
export interface AssignmentRuleConfig extends RuleConfig {
  assignment_strategy: string;
  priority_factors?: PriorityFactor[];
  [key: string]: any;
}

export interface PriorityFactor {
  factor: string;
  weight: number;
  inverse?: boolean;
}

/**
 * 検証のルール設定
 */
export interface ValidationRuleConfig extends RuleConfig {
  validation_type: string;
  [key: string]: any;
}

/**
 * 最適化のルール設定
 */
export interface OptimizationRuleConfig extends RuleConfig {
  optimization_goal: string;
  constraints?: any[];
  [key: string]: any;
}

/**
 * ルール評価コンテキスト
 */
export interface RuleEvaluationContext {
  // 従業員データ
  employees?: any[];
  
  // シフトデータ
  shifts?: any[];
  
  // 業務グループ
  businessGroups?: string[];
  
  // 営業所
  location?: string;
  
  // 日付範囲
  startDate?: Date;
  endDate?: Date;
  
  // その他のコンテキスト
  [key: string]: any;
}

/**
 * ルール評価結果
 */
export interface RuleEvaluationResult {
  // 評価が成功したか
  passed: boolean;
  
  // スコア（0-1）
  score?: number;
  
  // メッセージ
  message?: string;
  
  // 違反詳細
  violations?: RuleViolation[];
  
  // 推奨事項
  recommendations?: string[];
  
  // その他のデータ
  [key: string]: any;
}

/**
 * ルール違反
 */
export interface RuleViolation {
  rule_id: string;
  rule_name: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: any;
}

/**
 * ルールテンプレート
 */
export interface RuleTemplate {
  name: string;
  category: string;
  type: RuleType;
  description: string;
  config: RuleConfig;
  default_priority?: number;
  default_enforcement?: EnforcementLevel;
}
