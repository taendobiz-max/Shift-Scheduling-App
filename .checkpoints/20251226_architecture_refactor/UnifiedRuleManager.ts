/**
 * 統合シフトルール管理システム
 * 
 * 制約条件とビジネスルールを統合して管理するマネージャークラス
 */

import { supabase } from './supabaseClient';
import type {
  UnifiedRule,
  RuleType,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleViolation
} from '../types/unifiedRule';

export class UnifiedRuleManager {
  private static readonly TABLE_NAME = 'unified_shift_rules';
  
  /**
   * 全ルールを取得
   */
  static async getAllRules(): Promise<UnifiedRule[]> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .order('priority_level', { ascending: true })
      .order('rule_name', { ascending: true });
    
    if (error) {
      throw new Error(`ルール取得エラー: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * 有効なルールのみを取得
   */
  static async getActiveRules(): Promise<UnifiedRule[]> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('is_active', true)
      .order('priority_level', { ascending: true })
      .order('rule_name', { ascending: true });
    
    if (error) {
      throw new Error(`ルール取得エラー: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * 営業所別にルールを取得
   */
  static async getRulesByLocation(
    location: string,
    ruleType?: RuleType
  ): Promise<UnifiedRule[]> {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('is_active', true)
      .order('priority_level', { ascending: true });
    
    // 営業所フィルター
    // applicable_locations に location が含まれる
    query = query.contains('applicable_locations', [location]);
    
    // ルールタイプフィルター
    if (ruleType) {
      query = query.eq('rule_type', ruleType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`ルール取得エラー: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * ルールタイプ別にルールを取得
   */
  static async getRulesByType(ruleType: RuleType): Promise<UnifiedRule[]> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('rule_type', ruleType)
      .eq('is_active', true)
      .order('priority_level', { ascending: true });
    
    if (error) {
      throw new Error(`ルール取得エラー: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * IDでルールを取得
   */
  static async getRuleById(id: string): Promise<UnifiedRule | null> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`ルール取得エラー: ${error.message}`);
    }
    
    return data;
  }
  
  /**
   * ルールを作成
   */
  static async createRule(
    rule: Omit<UnifiedRule, 'id' | 'created_at' | 'updated_at'>
  ): Promise<UnifiedRule> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .insert(rule)
      .select()
      .single();
    
    if (error) {
      throw new Error(`ルール作成エラー: ${error.message}`);
    }
    
    return data;
  }
  
  /**
   * ルールを更新
   */
  static async updateRule(
    id: string,
    updates: Partial<UnifiedRule>
  ): Promise<UnifiedRule> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`ルール更新エラー: ${error.message}`);
    }
    
    return data;
  }
  
  /**
   * ルールを削除
   */
  static async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(`ルール削除エラー: ${error.message}`);
    }
  }
  
  /**
   * ルールの有効/無効を切り替え
   */
  static async toggleRuleActive(id: string): Promise<UnifiedRule> {
    const rule = await this.getRuleById(id);
    if (!rule) {
      throw new Error(`ルールが見つかりません: ${id}`);
    }
    
    return await this.updateRule(id, {
      is_active: !rule.is_active
    });
  }
  
  /**
   * ルールを評価
   */
  static async evaluateRule(
    rule: UnifiedRule,
    context: RuleEvaluationContext
  ): Promise<RuleEvaluationResult> {
    switch (rule.rule_type) {
      case 'constraint':
        return this.evaluateConstraint(rule, context);
      case 'filter':
        return this.evaluateFilter(rule, context);
      case 'assignment':
        return this.evaluateAssignment(rule, context);
      case 'validation':
        return this.evaluateValidation(rule, context);
      case 'optimization':
        return this.evaluateOptimization(rule, context);
      default:
        throw new Error(`未知のルールタイプ: ${rule.rule_type}`);
    }
  }
  
  /**
   * 制約条件を評価
   */
  private static evaluateConstraint(
    rule: UnifiedRule,
    context: RuleEvaluationContext
  ): RuleEvaluationResult {
    const config = rule.rule_config;
    const violations: RuleViolation[] = [];
    
    // 制約タイプに応じた評価ロジック
    // TODO: 各制約タイプの実装
    
    return {
      passed: violations.length === 0,
      violations,
      message: violations.length === 0 
        ? '制約条件を満たしています' 
        : `${violations.length}件の違反があります`
    };
  }
  
  /**
   * フィルターを評価
   */
  private static evaluateFilter(
    rule: UnifiedRule,
    context: RuleEvaluationContext
  ): RuleEvaluationResult {
    // TODO: フィルター評価ロジックの実装
    return {
      passed: true,
      message: 'フィルター評価は未実装です'
    };
  }
  
  /**
   * 割り当てロジックを評価
   */
  private static evaluateAssignment(
    rule: UnifiedRule,
    context: RuleEvaluationContext
  ): RuleEvaluationResult {
    // TODO: 割り当てロジックの実装
    return {
      passed: true,
      message: '割り当てロジック評価は未実装です'
    };
  }
  
  /**
   * 検証を評価
   */
  private static evaluateValidation(
    rule: UnifiedRule,
    context: RuleEvaluationContext
  ): RuleEvaluationResult {
    // TODO: 検証ロジックの実装
    return {
      passed: true,
      message: '検証評価は未実装です'
    };
  }
  
  /**
   * 最適化を評価
   */
  private static evaluateOptimization(
    rule: UnifiedRule,
    context: RuleEvaluationContext
  ): RuleEvaluationResult {
    // TODO: 最適化ロジックの実装
    return {
      passed: true,
      message: '最適化評価は未実装です'
    };
  }
  
  /**
   * 複数のルールを一括評価
   */
  static async evaluateRules(
    rules: UnifiedRule[],
    context: RuleEvaluationContext
  ): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    
    for (const rule of rules) {
      try {
        const result = await this.evaluateRule(rule, context);
        results.push(result);
      } catch (error) {
        results.push({
          passed: false,
          message: `評価エラー: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
    
    return results;
  }
  
  /**
   * ルールの統計情報を取得
   */
  static async getRuleStatistics(): Promise<{
    total: number;
    active: number;
    byType: Record<RuleType, number>;
    byEnforcement: Record<string, number>;
  }> {
    const rules = await this.getAllRules();
    
    const stats = {
      total: rules.length,
      active: rules.filter(r => r.is_active).length,
      byType: {} as Record<RuleType, number>,
      byEnforcement: {} as Record<string, number>
    };
    
    rules.forEach(rule => {
      // タイプ別
      stats.byType[rule.rule_type] = (stats.byType[rule.rule_type] || 0) + 1;
      
      // 強制レベル別
      stats.byEnforcement[rule.enforcement_level] = 
        (stats.byEnforcement[rule.enforcement_level] || 0) + 1;
    });
    
    return stats;
  }
}

export default UnifiedRuleManager;
