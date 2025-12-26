/**
 * UnifiedRuleAdapter (API Server)
 * 
 * unified_shift_rulesテーブルをenhanced_constraints形式に変換して
 * 既存のConstraintEngineと互換性を保つアダプター
 */

import { supabase } from './supabaseClient';
import { EnhancedConstraint } from './constraintEngine';

interface UnifiedRule {
  id: string;
  rule_name: string;
  rule_type: string;
  rule_category: string;
  rule_config: any;
  description?: string;
  applicable_locations: string[];
  priority_level: number;
  enforcement_level: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class UnifiedRuleAdapter {
  /**
   * unified_shift_rulesからenhanced_constraints形式に変換
   */
  private static convertToEnhancedConstraint(rule: UnifiedRule): EnhancedConstraint | null {
    // constraint タイプのルールのみ変換
    if (rule.rule_type !== 'constraint') {
      return null;
    }

    // rule_configから constraint_type と constraint_value を抽出
    const config = rule.rule_config as any;
    const constraintType = config.constraint_type || config.type || 'unknown';
    const constraintValue = config.value || config.constraint_value || 0;

    return {
      id: rule.id,
      constraint_name: rule.rule_name,
      constraint_category: rule.rule_category,
      constraint_type: constraintType,
      constraint_value: constraintValue,
      constraint_description: rule.description || '',
      applicable_locations: rule.applicable_locations,
      priority_level: rule.priority_level,
      enforcement_level: rule.enforcement_level,
      is_active: rule.is_active,
      created_at: rule.created_at,
      updated_at: rule.updated_at
    };
  }

  /**
   * 全ての制約条件を取得（enhanced_constraints互換）
   */
  static async getAllConstraints(): Promise<EnhancedConstraint[]> {
    try {
      const { data, error } = await supabase
        .from('unified_shift_rules')
        .select('*')
        .eq('rule_type', 'constraint')
        .order('priority_level', { ascending: true })
        .order('rule_category', { ascending: true })
        .order('rule_name', { ascending: true });

      if (error) {
        console.error('❌ [API_ADAPTER] Failed to load unified rules:', error);
        throw new Error(`制約条件の取得に失敗しました: ${error.message}`);
      }

      const constraints = (data || [])
        .map(rule => this.convertToEnhancedConstraint(rule as UnifiedRule))
        .filter((c): c is EnhancedConstraint => c !== null);

      console.log(`✅ [API_ADAPTER] Converted ${constraints.length} unified rules to constraints`);
      return constraints;
    } catch (error) {
      console.error('❌ [API_ADAPTER] Error in getAllConstraints:', error);
      throw error;
    }
  }

  /**
   * 指定拠点の有効な制約条件を取得（enhanced_constraints互換）
   */
  static async getActiveConstraintsByLocation(location: string): Promise<EnhancedConstraint[]> {
    try {
      const { data, error } = await supabase
        .from('unified_shift_rules')
        .select('*')
        .eq('rule_type', 'constraint')
        .eq('is_active', true)
        .order('priority_level', { ascending: true });

      if (error) {
        console.error('❌ [API_ADAPTER] Failed to load unified rules:', error);
        throw new Error(`制約条件の取得に失敗しました: ${error.message}`);
      }

      // 指定拠点に適用される制約のみフィルタリング
      const filteredRules = (data || []).filter((rule: any) => 
        rule.applicable_locations.includes(location) || 
        rule.applicable_locations.includes('全拠点')
      );

      const constraints = filteredRules
        .map(rule => this.convertToEnhancedConstraint(rule as UnifiedRule))
        .filter((c): c is EnhancedConstraint => c !== null);

      console.log(`✅ [API_ADAPTER] Loaded ${constraints.length} active constraints for location: ${location}`);
      return constraints;
    } catch (error) {
      console.error('❌ [API_ADAPTER] Error in getActiveConstraintsByLocation:', error);
      throw error;
    }
  }

  /**
   * フォールバック: unified_shift_rulesが存在しない場合はenhanced_constraintsから読み込む
   */
  static async getAllConstraintsWithFallback(): Promise<EnhancedConstraint[]> {
    try {
      // まず unified_shift_rules から取得を試みる
      return await this.getAllConstraints();
    } catch (error) {
      console.warn('⚠️ [API_ADAPTER] Falling back to enhanced_constraints table');
      
      // フォールバック: enhanced_constraints から取得
      try {
        const { data, error } = await supabase
          .from('enhanced_constraints')
          .select('*')
          .order('priority_level', { ascending: true });

        if (error) throw error;
        return data || [];
      } catch (fallbackError) {
        console.error('❌ [API_ADAPTER] Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * フォールバック: unified_shift_rulesが存在しない場合はenhanced_constraintsから読み込む
   */
  static async getActiveConstraintsByLocationWithFallback(location: string): Promise<EnhancedConstraint[]> {
    try {
      // まず unified_shift_rules から取得を試みる
      return await this.getActiveConstraintsByLocation(location);
    } catch (error) {
      console.warn('⚠️ [API_ADAPTER] Falling back to enhanced_constraints table');
      
      // フォールバック: enhanced_constraints から取得
      try {
        const { data, error } = await supabase
          .from('enhanced_constraints')
          .select('*')
          .eq('is_active', true)
          .order('priority_level', { ascending: true});

        if (error) throw error;

        // 指定拠点に適用される制約のみフィルタリング
        const filteredConstraints = (data || []).filter((constraint: any) => 
          constraint.applicable_locations.includes(location) || 
          constraint.applicable_locations.includes('全拠点')
        );

        return filteredConstraints;
      } catch (fallbackError) {
        console.error('❌ [API_ADAPTER] Fallback also failed:', fallbackError);
        return [];
      }
    }
  }
}
