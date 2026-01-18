/**
 * ビジネスルールエンジンの型定義
 * シフト生成時の業務割り当てルールを管理・実行するための型
 */

// ============================================================================
// ルールタイプの定義
// ============================================================================

/**
 * ルールタイプ
 */
export type RuleType = 
  | 'business_assignment'  // 業務割り当て時のルール
  | 'employee_filter'      // 従業員フィルタリングルール
  | 'constraint_check'     // 制約チェックルール
  | 'pair_business'        // ペア業務ルール
  | 'custom';              // カスタムルール

/**
 * ルールハンドラー名
 */
export type RuleHandlerName =
  | 'team_rotation_filter'   // 班ローテーションフィルタ
  | 'team_filter'            // 班指定フィルタ
  | 'consecutive_pair'       // 連続ペア割り当て
  | 'skill_filter'           // スキルベースフィルタ
  | 'roll_call_filter'       // 点呼業務フィルタ
  | 'custom';                // カスタムハンドラー

// ============================================================================
// ビジネスルール型
// ============================================================================

/**
 * ビジネスルール（データベーススキーマ）
 */
export interface BusinessRule {
  rule_id: string;
  rule_name: string;
  rule_type: RuleType;
  priority: number;
  enabled: boolean;
  営業所: string | null;
  conditions: RuleConditions;
  actions: RuleActions;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * ルール条件
 */
export interface RuleConditions {
  業務タイプ?: string[];
  班ローテーション?: boolean;
  班指定?: string[];
  has_pair_business_id?: boolean;
  運行日数?: number;
  [key: string]: any;
}

/**
 * ルールアクション
 */
export interface RuleActions {
  filter_employees?: FilterEmployeesAction;
  assign_pair?: AssignPairAction;
  [key: string]: any;
}

/**
 * 従業員フィルタアクション
 */
export interface FilterEmployeesAction {
  handler: RuleHandlerName;
  params: {
    base_date?: string;
    teams?: string[];
    rotation_logic?: TeamRotationLogic;
    field?: string;
    strict?: boolean;
    [key: string]: any;
  };
}

/**
 * ペア割り当てアクション
 */
export interface AssignPairAction {
  handler: RuleHandlerName;
  params: {
    pair_field: string;
    days_span: number;
    same_employee: boolean;
    [key: string]: any;
  };
}

/**
 * 班ローテーションロジック
 */
export interface TeamRotationLogic {
  outbound_even_days: string;
  outbound_odd_days: string;
  return_even_days: string;
  return_odd_days: string;
}

// ============================================================================
// ルール評価コンテキスト
// ============================================================================

/**
 * ルール評価コンテキスト
 * シフト生成時にルールエンジンに渡される情報
 */
export interface RuleContext {
  // 業務情報
  business: BusinessInfo;
  
  // 日付情報
  date: string;  // YYYY-MM-DD形式
  
  // 営業所情報
  location: string;
  
  // 従業員プール
  availableEmployees: EmployeeInfo[];
  
  // 既存のシフト
  existingShifts: any[];
  
  // その他のコンテキスト
  [key: string]: any;
}

/**
 * 業務情報
 */
export interface BusinessInfo {
  業務名: string;
  業務グループ?: string;
  業務タイプ?: string;
  班指定?: string;
  ペア業務ID?: string;
  運行日数?: number;
  方向?: string;
  [key: string]: any;
}

/**
 * 従業員情報
 */
export interface EmployeeInfo {
  employee_id: string;
  name: string;
  班?: string;
  営業所: string;
  roll_call_capable?: boolean;
  roll_call_duty?: string;
  skills?: Record<string, string>;
  [key: string]: any;
}

/**
 * 割り当て情報
 */
export interface AssignmentInfo {
  employee_id: string;
  business_id: string;
  date: string;
  [key: string]: any;
}

// ============================================================================
// ルール評価結果
// ============================================================================

/**
 * ルール評価結果
 */
export interface RuleEvaluationResult {
  applicable: boolean;
  rule: BusinessRule;
  filteredEmployees?: EmployeeInfo[];
  pairAssignment?: PairAssignmentInfo;
  constraints?: ConstraintResult[];
  metadata?: Record<string, any>;
}

/**
 * ペア割り当て情報
 */
export interface PairAssignmentInfo {
  pair_business_id: string;
  primary_business_id: string;
  secondary_business_id: string;
  employee_id?: string;
  dates: string[];
}

/**
 * 制約チェック結果
 */
export interface ConstraintResult {
  passed: boolean;
  constraint_name: string;
  message?: string;
  severity: 'error' | 'warning' | 'info';
}

// ============================================================================
// ルールハンドラー型
// ============================================================================

/**
 * ルールハンドラー関数の型
 */
export type RuleHandler = (
  context: RuleContext,
  action: FilterEmployeesAction | AssignPairAction
) => Promise<RuleHandlerResult>;

/**
 * ルールハンドラー結果
 */
export interface RuleHandlerResult {
  success: boolean;
  filteredEmployees?: EmployeeInfo[];
  pairAssignment?: PairAssignmentInfo;
  error?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// ルールエンジンAPI型
// ============================================================================

/**
 * ルールエンジンクラスのインターフェース
 */
export interface IBusinessRuleEngine {
  /**
   * ルールを読み込み
   */
  loadRules(location?: string): Promise<void>;
  
  /**
   * 業務に適用可能なルールを取得
   */
  getApplicableRules(context: RuleContext): BusinessRule[];
  
  /**
   * ルールを評価して従業員をフィルタリング
   */
  filterEmployees(context: RuleContext): Promise<EmployeeInfo[]>;
  
  /**
   * ペア業務を処理
   */
  handlePairBusiness(context: RuleContext): Promise<PairAssignmentInfo | null>;
  
  /**
   * 制約をチェック
   */
  checkConstraints(context: RuleContext): Promise<ConstraintResult[]>;
  
  /**
   * すべてのルールを評価
   */
  evaluateRules(context: RuleContext): Promise<RuleEvaluationResult[]>;
}

// ============================================================================
// ユーティリティ型
// ============================================================================

/**
 * ルール作成用のフォームデータ
 */
export interface BusinessRuleFormData {
  rule_id: string;
  rule_name: string;
  rule_type: RuleType;
  priority: number;
  enabled: boolean;
  営業所: string | null;
  conditions: string;  // JSON文字列
  actions: string;     // JSON文字列
  description?: string;
}

/**
 * ルール検証結果
 */
export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
