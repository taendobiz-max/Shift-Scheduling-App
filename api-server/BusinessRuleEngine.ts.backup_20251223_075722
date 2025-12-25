/**
 * ビジネスルールエンジン
 * シフト生成時の業務割り当てルールを管理・実行
 */

import { createClient } from '@supabase/supabase-js';
import type {
  BusinessRule,
  RuleContext,
  RuleEvaluationResult,
  EmployeeInfo,
  PairAssignmentInfo,
  ConstraintResult,
  RuleHandler,
  RuleHandlerResult,
  FilterEmployeesAction,
  AssignPairAction,
  IBusinessRuleEngine
} from './rule-engine-types';

/**
 * ビジネスルールエンジンクラス
 */
export class BusinessRuleEngine implements IBusinessRuleEngine {
  private rules: BusinessRule[] = [];
  private handlers: Map<string, RuleHandler> = new Map();
  private supabase: any;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    
    // ハンドラーを登録
    this.registerHandlers();
  }

  /**
   * ルールハンドラーを登録
   */
  private registerHandlers(): void {
    this.handlers.set('team_rotation_filter', this.teamRotationFilterHandler.bind(this));
    this.handlers.set('team_filter', this.teamFilterHandler.bind(this));
    this.handlers.set('consecutive_pair', this.consecutivePairHandler.bind(this));
    this.handlers.set('skill_filter', this.skillFilterHandler.bind(this));
    this.handlers.set('roll_call_filter', this.rollCallFilterHandler.bind(this));
  }

  /**
   * ルールをデータベースから読み込み
   */
  async loadRules(location?: string): Promise<void> {
    try {
      console.log(`🔍 [RULE ENGINE] loadRules called with location: ${location}`);
      console.log(`🔍 [RULE ENGINE] Supabase client initialized: ${!!this.supabase}`);
      
      if (!this.supabase) {
        console.warn('⚠️ [RULE ENGINE] Supabase client not initialized, skipping rule loading');
        return;
      }

      console.log(`🔍 [RULE ENGINE] Querying business_rules table...`);
      
      let query = this.supabase
        .from('business_rules')
        .select('*')
        .eq('enabled', true)
        .order('priority', { ascending: false });

      if (location) {
        console.log(`🔍 [RULE ENGINE] Filtering by location: ${location}`);
        query = query.or(`営業所.eq.${location},営業所.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [RULE ENGINE] Query error:', error);
        throw error;
      }

      this.rules = data || [];
      console.log(`✅ [RULE ENGINE] Loaded ${this.rules.length} rules`);
      if (this.rules.length > 0) {
        console.log(`📋 [RULE ENGINE] Rules:`, this.rules.map(r => `${r.rule_name} (priority: ${r.priority})`));
      }
    } catch (error) {
      console.error('❌ [RULE ENGINE] Failed to load rules:', error);
      throw error;
    }
  }

  /**
   * ルールを直接設定（テスト用）
   */
  setRules(rules: BusinessRule[]): void {
    this.rules = rules.sort((a, b) => b.priority - a.priority);
    console.log(`✅ [RULE ENGINE] Set ${this.rules.length} rules manually`);
  }

  /**
   * 業務に適用可能なルールを取得
   */
  getApplicableRules(context: RuleContext): BusinessRule[] {
    return this.rules.filter(rule => {
      // 営業所チェック
      if (rule.営業所 && rule.営業所 !== context.location) {
        return false;
      }

      // 条件チェック
      return this.checkConditions(rule, context);
    });
  }

  /**
   * ルール条件をチェック
   */
  private checkConditions(rule: BusinessRule, context: RuleContext): boolean {
    const { conditions } = rule;
    const { business } = context;

    // 業務タイプチェック
    if (conditions.業務タイプ && conditions.業務タイプ.length > 0) {
      if (!business.業務タイプ || !conditions.業務タイプ.includes(business.業務タイプ)) {
        return false;
      }
    }

    // 班ローテーションチェック
    if (conditions.班ローテーション !== undefined) {
      if (business.班ローテーション !== conditions.班ローテーション) {
        return false;
      }
    }

    // 班指定チェック
    if (conditions.班指定 && conditions.班指定.length > 0) {
      if (!business.班指定 || !conditions.班指定.includes(business.班指定)) {
        return false;
      }
    }

    // ペア業務IDチェック
    if (conditions.has_pair_business_id) {
      if (!business.ペア業務ID) {
        return false;
      }
    }

    // 運行日数チェック
    if (conditions.運行日数) {
      if (business.運行日数 !== conditions.運行日数) {
        return false;
      }
    }

    // _contains 条件をチェック
    for (const key in conditions) {
      if (key.endsWith('_contains')) {
        const fieldName = key.replace('_contains', '');
        const conditionValue = conditions[key];
        const businessValue = business[fieldName];
        
        if (businessValue && typeof businessValue === 'string' && typeof conditionValue === 'string') {
          if (!businessValue.includes(conditionValue)) {
            return false;
          }
        } else if (!businessValue) {
          return false;
        }
      }
    }

    // OR 条件をチェック
    if (conditions.OR) {
      let orMatched = false;
      for (const key in conditions.OR) {
        if (key.endsWith('_contains')) {
          const fieldName = key.replace('_contains', '');
          const conditionValue = conditions.OR[key];
          const businessValue = business[fieldName];
          
          if (businessValue && typeof businessValue === 'string' && typeof conditionValue === 'string') {
            if (businessValue.includes(conditionValue)) {
              orMatched = true;
              break;
            }
          }
        }
      }
      if (!orMatched) {
        return false;
      }
    }

    return true;
  }

  /**
   * ルールを評価して従業員をフィルタリング
   */
  async filterEmployees(context: RuleContext): Promise<EmployeeInfo[]> {
    let filteredEmployees = [...context.availableEmployees];
    const applicableRules = this.getApplicableRules(context);

    console.log(`🔍 [RULE ENGINE] Filtering employees with ${applicableRules.length} rules`);

    for (const rule of applicableRules) {
      if (rule.actions.filter_employees) {
        const action = rule.actions.filter_employees;
        const handler = this.handlers.get(action.handler);

        if (handler) {
          try {
            // Update context with current filtered employees
            const updatedContext = {
              ...context,
              availableEmployees: filteredEmployees
            };
            
            const result = await handler(updatedContext, action);
            if (result.success && result.filteredEmployees) {
              filteredEmployees = result.filteredEmployees;
              console.log(`  ✓ Rule "${rule.rule_name}": ${filteredEmployees.length} employees remaining`);
            }
          } catch (error) {
            console.error(`  ✗ Rule "${rule.rule_name}" failed:`, error);
          }
        }
      }
    }

    return filteredEmployees;
  }

  /**
   * ペア業務を処理
   */
  async handlePairBusiness(context: RuleContext): Promise<PairAssignmentInfo | null> {
    const applicableRules = this.getApplicableRules(context);

    for (const rule of applicableRules) {
      if (rule.actions.assign_pair) {
        const action = rule.actions.assign_pair;
        const handler = this.handlers.get(action.handler);

        if (handler) {
          try {
            const result = await handler(context, action);
            if (result.success && result.pairAssignment) {
              console.log(`✓ Pair business handled by rule "${rule.rule_name}"`);
              return result.pairAssignment;
            }
          } catch (error) {
            console.error(`✗ Pair business rule "${rule.rule_name}" failed:`, error);
          }
        }
      }
    }

    return null;
  }

  /**
   * 制約をチェック
   */
  async checkConstraints(context: RuleContext): Promise<ConstraintResult[]> {
    const results: ConstraintResult[] = [];
    const applicableRules = this.getApplicableRules(context).filter(
      rule => rule.rule_type === 'constraint_check'
    );

    for (const rule of applicableRules) {
      // 制約チェックロジックは今後実装
      // 現時点ではプレースホルダー
    }

    return results;
  }

  /**
   * すべてのルールを評価
   */
  async evaluateRules(context: RuleContext): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    const applicableRules = this.getApplicableRules(context);

    for (const rule of applicableRules) {
      const result: RuleEvaluationResult = {
        applicable: true,
        rule
      };

      // 従業員フィルタ
      if (rule.actions.filter_employees) {
        const filtered = await this.filterEmployees(context);
        result.filteredEmployees = filtered;
      }

      // ペア業務
      if (rule.actions.assign_pair) {
        const pairInfo = await this.handlePairBusiness(context);
        result.pairAssignment = pairInfo || undefined;
      }

      results.push(result);
    }

    return results;
  }

  // ========================================================================
  // ルールハンドラー実装
  // ========================================================================

  /**
   * 班ローテーションフィルタハンドラー
   * 夜行バスの班ローテーションロジックを実装
   */
  private async teamRotationFilterHandler(
    context: RuleContext,
    action: FilterEmployeesAction
  ): Promise<RuleHandlerResult> {
    try {
      const { base_date, teams, rotation_logic } = action.params;
      const { business, date, availableEmployees } = context;

      if (!base_date || !teams || !rotation_logic) {
        throw new Error('Missing required parameters for team_rotation_filter');
      }

      // 基準日からの経過日数を計算
      const baseDate = new Date(base_date);
      const currentDate = new Date(date);
      const daysDiff = Math.floor((currentDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      const isEvenDay = daysDiff % 2 === 0;

      // 業務の方向（往路/復路）を判定
      const direction = business.方向 || business.業務タイプ?.includes('outbound') ? 'outbound' : 'return';

      // ローテーションロジックに基づいて担当班を決定
      let assignedTeam: string;
      const dayType = isEvenDay ? 'even_day' : 'odd_day';
      const directionKey = direction === 'outbound' ? 'outbound' : 'return';
      
      // rotation_logicの構造: { even_day: { outbound: "Galaxy", return: "Aube" }, odd_day: { ... } }
      assignedTeam = rotation_logic[dayType]?.[directionKey];
      
      if (!assignedTeam) {
        throw new Error(`Invalid rotation logic: ${dayType}.${directionKey}`);
      }

      // 担当班の従業員のみをフィルタ
      const filteredEmployees = availableEmployees.filter(emp => emp.班 === assignedTeam);

      console.log(`  🔄 Team rotation: Day ${daysDiff} (${isEvenDay ? 'even' : 'odd'}), ${direction} → ${assignedTeam} (${filteredEmployees.length} employees)`);

      return {
        success: true,
        filteredEmployees,
        metadata: {
          assigned_team: assignedTeam,
          days_from_base: daysDiff,
          is_even_day: isEvenDay,
          direction
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 班指定フィルタハンドラー
   */
  private async teamFilterHandler(
    context: RuleContext,
    action: FilterEmployeesAction
  ): Promise<RuleHandlerResult> {
    try {
      const { field, strict } = action.params;
      const { business, availableEmployees } = context;

      const teamValue = business[field || '班指定'];
      if (!teamValue) {
        return {
          success: true,
          filteredEmployees: availableEmployees
        };
      }

      const filteredEmployees = availableEmployees.filter(emp => emp.班 === teamValue);

      console.log(`  👥 Team filter: ${teamValue} → ${filteredEmployees.length} employees`);

      return {
        success: true,
        filteredEmployees
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 連続ペア割り当てハンドラー
   */
  private async consecutivePairHandler(
    context: RuleContext,
    action: AssignPairAction
  ): Promise<RuleHandlerResult> {
    try {
      const { pair_field, days_span, same_employee } = action.params;
      const { business } = context;

      const pairBusinessId = business[pair_field];
      if (!pairBusinessId) {
        return {
          success: true,
          pairAssignment: undefined
        };
      }

      // ペア業務情報を構築
      const pairAssignment: PairAssignmentInfo = {
        pair_business_id: pairBusinessId,
        primary_business_id: business.id,
        secondary_business_id: '', // これは後で解決される
        dates: [] // これは後で計算される
      };

      console.log(`  🔗 Pair assignment: ${pairBusinessId} (${days_span} days)`);

      return {
        success: true,
        pairAssignment
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 点呼対応可能フィルタハンドラー
   * 点呼業務に対応可能な従業員のみをフィルタ
   */
  private async rollCallFilterHandler(
    context: RuleContext,
    action: FilterEmployeesAction
  ): Promise<RuleHandlerResult> {
    try {
      const { availableEmployees } = context;

      // 点呼対応可能な従業員のみをフィルタ
      const filtered = availableEmployees.filter(emp => {
        // roll_call_capable が true、または roll_call_duty が '1' の従業員
        return emp.roll_call_capable === true || emp.roll_call_duty === '1';
      });

      console.log(`  📞 Roll call filter: ${availableEmployees.length} → ${filtered.length} employees`);

      return {
        success: true,
        filteredEmployees: filtered
      };
    } catch (error) {
      console.error('  ❌ Roll call filter error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        filteredEmployees: context.availableEmployees
      };
    }
  }

  /**
   * スキルフィルタハンドラー
   */
  private async skillFilterHandler(
    context: RuleContext,
    action: FilterEmployeesAction
  ): Promise<RuleHandlerResult> {
    try {
      const { business, availableEmployees } = context;
      
      // スキルマトリックスに基づくフィルタリング
      // この実装は既存のスキルチェックロジックと統合される
      
      return {
        success: true,
        filteredEmployees: availableEmployees
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * シングルトンインスタンス
 */
let engineInstance: BusinessRuleEngine | null = null;

/**
 * ルールエンジンのシングルトンインスタンスを取得
 */
export function getRuleEngine(supabaseUrl?: string, supabaseKey?: string): BusinessRuleEngine {
  if (!engineInstance) {
    engineInstance = new BusinessRuleEngine(supabaseUrl, supabaseKey);
  }
  return engineInstance;
}

/**
 * ルールエンジンをリセット（テスト用）
 */
export function resetRuleEngine(): void {
  engineInstance = null;
}
