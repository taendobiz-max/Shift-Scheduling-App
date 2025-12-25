/**
 * UnifiedRuleAdapter
 * 
 * unified_shift_rulesテーブルをenhanced_constraints形式に変換して
 * 既存のConstraintEngineと互換性を保つアダプター
 * 
 * v2: 制約グループ機能を追加
 */

import { supabase } from './supabaseClient';
import type { UnifiedRule } from '../types/unifiedRule';
import type { EnhancedConstraint } from '../types/constraint';

export interface ConstraintGroup {
  id: string;
  group_name: string;
  group_description: string;
  evaluation_logic: 'OR' | 'AND';
  child_rules: string[];
  priority_level: number;
  is_active: boolean;
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

    // グループルールはスキップ（別途処理）
    const config = rule.rule_config as any;
    if (config.is_group) {
      return null;
    }

    // rule_configから constraint_type と constraint_value を抽出
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
   * unified_shift_rulesからConstraintGroup形式に変換
   */
  private static convertToConstraintGroup(rule: UnifiedRule): ConstraintGroup | null {
    const config = rule.rule_config as any;
    
    // グループルールのみ変換
    if (!config.is_group) {
      return null;
    }

    return {
      id: rule.id,
      group_name: rule.rule_name,
      group_description: rule.description || '',
      evaluation_logic: config.evaluation_logic || 'OR',
      child_rules: config.child_rules || [],
      priority_level: rule.priority_level,
      is_active: rule.is_active
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
        console.error('❌ [ADAPTER] Failed to load unified rules:', error);
        throw new Error(`制約条件の取得に失敗しました: ${error.message}`);
      }

      const constraints = (data || [])
        .map(rule => this.convertToEnhancedConstraint(rule as UnifiedRule))
        .filter((c): c is EnhancedConstraint => c !== null);

      console.log(`✅ [ADAPTER] Converted ${constraints.length} unified rules to constraints`);
      return constraints;
    } catch (error) {
      console.error('❌ [ADAPTER] Error in getAllConstraints:', error);
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
        console.error('❌ [ADAPTER] Failed to load unified rules:', error);
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

      console.log(`✅ [ADAPTER] Loaded ${constraints.length} active constraints for location: ${location}`);
      return constraints;
    } catch (error) {
      console.error('❌ [ADAPTER] Error in getActiveConstraintsByLocation:', error);
      throw error;
    }
  }

  /**
   * 全ての制約グループを取得
   */
  static async getAllConstraintGroups(): Promise<ConstraintGroup[]> {
    try {
      const { data, error } = await supabase
        .from('unified_shift_rules')
        .select('*')
        .eq('rule_type', 'constraint')
        .eq('rule_category', 'グループ')
        .order('priority_level', { ascending: true });

      if (error) {
        console.error('❌ [ADAPTER] Failed to load constraint groups:', error);
        throw new Error(`制約グループの取得に失敗しました: ${error.message}`);
      }

      const groups = (data || [])
        .map(rule => this.convertToConstraintGroup(rule as UnifiedRule))
        .filter((g): g is ConstraintGroup => g !== null);

      console.log(`✅ [ADAPTER] Loaded ${groups.length} constraint groups`);
      return groups;
    } catch (error) {
      console.error('❌ [ADAPTER] Error in getAllConstraintGroups:', error);
      throw error;
    }
  }

  /**
   * 指定拠点の有効な制約グループを取得
   */
  static async getActiveConstraintGroupsByLocation(location: string): Promise<ConstraintGroup[]> {
    try {
      const { data, error } = await supabase
        .from('unified_shift_rules')
        .select('*')
        .eq('rule_type', 'constraint')
        .eq('rule_category', 'グループ')
        .eq('is_active', true)
        .order('priority_level', { ascending: true });

      if (error) {
        console.error('❌ [ADAPTER] Failed to load constraint groups:', error);
        throw new Error(`制約グループの取得に失敗しました: ${error.message}`);
      }

      // 指定拠点に適用されるグループのみフィルタリング
      const filteredRules = (data || []).filter((rule: any) => 
        rule.applicable_locations.includes(location) || 
        rule.applicable_locations.includes('全拠点')
      );

      const groups = filteredRules
        .map(rule => this.convertToConstraintGroup(rule as UnifiedRule))
        .filter((g): g is ConstraintGroup => g !== null);

      console.log(`✅ [ADAPTER] Loaded ${groups.length} active constraint groups for location: ${location}`);
      return groups;
    } catch (error) {
      console.error('❌ [ADAPTER] Error in getActiveConstraintGroupsByLocation:', error);
      throw error;
    }
  }

  /**
   * グループIDから子ルール（制約条件）を取得
   */
  static async getConstraintsByGroupId(groupId: string): Promise<EnhancedConstraint[]> {
    try {
      // グループルールを取得
      const { data: groupData, error: groupError } = await supabase
        .from('unified_shift_rules')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError || !groupData) {
        console.error('❌ [ADAPTER] Failed to load group:', groupError);
        return [];
      }

      const config = groupData.rule_config as any;
      const childRuleIds = config.child_rules || [];

      if (childRuleIds.length === 0) {
        return [];
      }

      // 子ルールを取得
      const { data, error } = await supabase
        .from('unified_shift_rules')
        .select('*')
        .in('id', childRuleIds);

      if (error) {
        console.error('❌ [ADAPTER] Failed to load child rules:', error);
        return [];
      }

      const constraints = (data || [])
        .map(rule => this.convertToEnhancedConstraint(rule as UnifiedRule))
        .filter((c): c is EnhancedConstraint => c !== null);

      console.log(`✅ [ADAPTER] Loaded ${constraints.length} child rules for group: ${groupId}`);
      return constraints;
    } catch (error) {
      console.error('❌ [ADAPTER] Error in getConstraintsByGroupId:', error);
      return [];
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
      console.warn('⚠️ [ADAPTER] Falling back to enhanced_constraints table');
      
      // フォールバック: enhanced_constraints から取得
      try {
        const { data, error } = await supabase
          .from('enhanced_constraints')
          .select('*')
          .order('priority_level', { ascending: true });

        if (error) throw error;
        return data || [];
      } catch (fallbackError) {
        console.error('❌ [ADAPTER] Fallback also failed:', fallbackError);
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
      console.warn('⚠️ [ADAPTER] Falling back to enhanced_constraints table');
      
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
        console.error('❌ [ADAPTER] Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * フォールバック: unified_shift_rulesが存在しない場合はconstraint_groupsから読み込む
   */
  static async getAllConstraintGroupsWithFallback(): Promise<ConstraintGroup[]> {
    try {
      // まず unified_shift_rules から取得を試みる
      return await this.getAllConstraintGroups();
    } catch (error) {
      console.warn('⚠️ [ADAPTER] Falling back to constraint_groups table');
      
      // フォールバック: constraint_groups から取得
      try {
        const { data, error } = await supabase
          .from('constraint_groups')
          .select('*')
          .order('priority_level', { ascending: true });

        if (error) throw error;
        
        // constraint_groups形式からConstraintGroup形式に変換
        return (data || []).map((group: any) => ({
          id: group.id,
          group_name: group.group_name,
          group_description: group.group_description,
          evaluation_logic: group.evaluation_logic,
          child_rules: [], // 別途取得が必要
          priority_level: group.priority_level,
          is_active: group.is_active
        }));
      } catch (fallbackError) {
        console.error('❌ [ADAPTER] Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * フォールバック: unified_shift_rulesが存在しない場合はenhanced_constraintsから読み込む
   */
  static async getConstraintsByGroupIdWithFallback(groupId: string): Promise<EnhancedConstraint[]> {
    try {
      // まず unified_shift_rules から取得を試みる
      return await this.getConstraintsByGroupId(groupId);
    } catch (error) {
      console.warn('⚠️ [ADAPTER] Falling back to enhanced_constraints table');
      
      // フォールバック: enhanced_constraints から取得
      try {
        const { data, error } = await supabase
          .from('enhanced_constraints')
          .select('*')
          .eq('constraint_group_id', groupId);

        if (error) throw error;
        return data || [];
      } catch (fallbackError) {
        console.error('❌ [ADAPTER] Fallback also failed:', fallbackError);
        return [];
      }
    }
  }
}
