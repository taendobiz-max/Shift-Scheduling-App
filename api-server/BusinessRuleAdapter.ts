/**
 * BusinessRuleAdapter
 * 
 * unified_shift_rulesテーブルからビジネスルール（rule_type='business_logic'）を取得し、
 * BusinessRule形式に変換するアダプター。
 * フォールバック機能付き: unified_shift_rulesが存在しない場合はbusiness_rulesから取得。
 */

import { createClient } from '@supabase/supabase-js';
import type { BusinessRule } from './rule-engine-types';

export class BusinessRuleAdapter {
  private supabase: any;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * unified_shift_rulesからビジネスルールを取得（フォールバック付き）
   */
  async loadBusinessRules(location?: string): Promise<BusinessRule[]> {
    console.log(`🔄 [BUSINESS_RULE_ADAPTER] Loading business rules for location: ${location || 'all'}`);
    
    try {
      // まずunified_shift_rulesから取得を試みる
      const unifiedRules = await this.loadFromUnifiedRules(location);
      
      if (unifiedRules.length > 0) {
        console.log(`✅ [BUSINESS_RULE_ADAPTER] Loaded ${unifiedRules.length} business rules from unified_shift_rules`);
        return unifiedRules;
      }
      
      // フォールバック: business_rulesから取得
      console.log(`⚠️ [BUSINESS_RULE_ADAPTER] No rules found in unified_shift_rules, falling back to business_rules`);
      const legacyRules = await this.loadFromLegacyRules(location);
      console.log(`✅ [BUSINESS_RULE_ADAPTER] Loaded ${legacyRules.length} business rules from business_rules (legacy)`);
      return legacyRules;
      
    } catch (error) {
      console.error('❌ [BUSINESS_RULE_ADAPTER] Failed to load business rules:', error);
      throw error;
    }
  }

  /**
   * unified_shift_rulesからビジネスルールを取得
   */
  private async loadFromUnifiedRules(location?: string): Promise<BusinessRule[]> {
    if (!this.supabase) {
      console.warn('⚠️ [BUSINESS_RULE_ADAPTER] Supabase client not initialized');
      return [];
    }

    try {
      let query = this.supabase
        .from('unified_shift_rules')
        .select('*')
        .eq('rule_type', 'business_logic')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (location) {
        // applicable_locationsに指定拠点または'全拠点'が含まれるルールを取得
        query = query.or(`applicable_locations.cs.{${location}},applicable_locations.cs.{全拠点}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [BUSINESS_RULE_ADAPTER] Query error (unified_shift_rules):', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // unified_shift_rules形式からBusinessRule形式に変換
      return data.map(rule => this.convertUnifiedRuleToBusinessRule(rule));
      
    } catch (error) {
      console.error('❌ [BUSINESS_RULE_ADAPTER] Error loading from unified_shift_rules:', error);
      return [];
    }
  }

  /**
   * business_rulesから直接取得（レガシー）
   */
  private async loadFromLegacyRules(location?: string): Promise<BusinessRule[]> {
    if (!this.supabase) {
      console.warn('⚠️ [BUSINESS_RULE_ADAPTER] Supabase client not initialized');
      return [];
    }

    try {
      let query = this.supabase
        .from('business_rules')
        .select('*')
        .eq('enabled', true)
        .order('priority', { ascending: false });

      if (location) {
        query = query.or(`営業所.eq.${location},営業所.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [BUSINESS_RULE_ADAPTER] Query error (business_rules):', error);
        throw error;
      }

      return data || [];
      
    } catch (error) {
      console.error('❌ [BUSINESS_RULE_ADAPTER] Error loading from business_rules:', error);
      throw error;
    }
  }

  /**
   * unified_shift_rules形式からBusinessRule形式に変換
   */
  private convertUnifiedRuleToBusinessRule(unifiedRule: any): BusinessRule {
    // rule_configからconditionsとactionsを抽出
    const config = unifiedRule.rule_config || {};
    
    return {
      rule_id: unifiedRule.id,
      rule_name: unifiedRule.rule_name,
      rule_type: config.rule_type || 'team_filter',
      priority: unifiedRule.priority,
      enabled: unifiedRule.is_active,
      営業所: this.extractLocation(unifiedRule.applicable_locations),
      conditions: config.conditions || {},
      actions: config.actions || {},
      description: unifiedRule.description,
      created_at: unifiedRule.created_at,
      updated_at: unifiedRule.updated_at,
    };
  }

  /**
   * applicable_locationsから営業所を抽出
   * 複数拠点の場合はnull（全拠点）として扱う
   */
  private extractLocation(applicableLocations: string[]): string | null {
    if (!applicableLocations || applicableLocations.length === 0) {
      return null;
    }
    
    if (applicableLocations.includes('全拠点') || applicableLocations.length > 1) {
      return null;
    }
    
    return applicableLocations[0];
  }
}
