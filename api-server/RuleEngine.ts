/**
 * 統合ルールエンジン
 * 
 * unified_shift_rulesテーブルからルールを読み込み、
 * シフト生成時に適用するエンジン
 */

import { supabase } from './supabaseClient';

// ルール型定義
export interface UnifiedRule {
  id: string;
  rule_name: string;
  rule_category: string;
  description?: string;
  applicable_locations: string[];
  applicable_business_groups?: string[];
  applicable_employees?: string[];
  rule_type: string;
  rule_config: Record<string, any>;
  priority_level: number;
  enforcement_level: string;
  is_active: boolean;
}

// シフト型定義
export interface Shift {
  employee_id: string;
  employee_name?: string;
  business_group: string;
  business_name?: string;
  start_time: string;
  end_time: string;
  shift_date: string;
}

// 評価結果
export interface RuleEvaluationResult {
  passed: boolean;
  rule_name: string;
  message?: string;
  details?: any;
}

// キャッシュされたルール
let cachedRules: UnifiedRule[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1分

/**
 * ルールエンジンクラス
 */
export class RuleEngine {
  private location: string;
  private rules: UnifiedRule[] = [];

  constructor(location: string) {
    this.location = location;
  }

  /**
   * ルールを読み込む
   */
  async loadRules(): Promise<void> {
    const now = Date.now();
    
    // キャッシュが有効ならそれを使用
    if (cachedRules && (now - cacheTimestamp) < CACHE_TTL) {
      this.rules = cachedRules.filter(r => 
        r.applicable_locations.includes(this.location) && r.is_active
      );
      console.log(`📋 [RULE_ENGINE] Loaded ${this.rules.length} rules from cache for ${this.location}`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('unified_shift_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority_level', { ascending: true });

      if (error) {
        console.error('❌ [RULE_ENGINE] Failed to load rules:', error);
        return;
      }

      cachedRules = data || [];
      cacheTimestamp = now;

      this.rules = cachedRules.filter(r => 
        r.applicable_locations.includes(this.location)
      );

      console.log(`📋 [RULE_ENGINE] Loaded ${this.rules.length} rules for ${this.location}`);
      this.rules.forEach(r => {
        console.log(`  - ${r.rule_name} (${r.rule_type}, ${r.enforcement_level})`);
      });
    } catch (err) {
      console.error('❌ [RULE_ENGINE] Error loading rules:', err);
    }
  }

  /**
   * 1日の最大労働時間を取得
   */
  getMaxDailyWorkHours(): number {
    const rule = this.rules.find(r => 
      r.rule_config?.constraint_type === 'max_daily_work_hours'
    );
    return rule?.rule_config?.value ?? 15; // デフォルト15時間
  }

  /**
   * 1日の最大シフト数を取得
   */
  getMaxDailyShifts(): number {
    const rule = this.rules.find(r => 
      r.rule_config?.constraint_type === 'max_daily_shifts'
    );
    return rule?.rule_config?.value ?? 3; // デフォルト3シフト
  }

  /**
   * 排他的な業務グループを取得
   */
  getExclusiveGroups(): string[][] {
    const rule = this.rules.find(r => 
      r.rule_config?.constraint_type === 'exclusive_assignment'
    );
    return rule?.rule_config?.exclusive_groups ?? [];
  }

  /**
   * 1日の労働時間チェック
   */
  checkDailyWorkHours(
    employeeId: string,
    newBusiness: any,
    currentShifts: Shift[],
    targetDate: string
  ): RuleEvaluationResult {
    const maxHours = this.getMaxDailyWorkHours();
    const businessName = newBusiness.業務名 || newBusiness.name || 'Unknown';

    // 同じ日の同じ従業員のシフトを取得
    const employeeShifts = currentShifts.filter(s => 
      s.employee_id === employeeId && s.shift_date === targetDate
    );

    // 既存シフトの労働時間を計算
    let totalHours = 0;
    for (const shift of employeeShifts) {
      totalHours += this.calculateShiftHours(shift.start_time, shift.end_time);
    }

    // 新しい業務の労働時間を追加
    const newStart = newBusiness.開始時間 || newBusiness.start_time || '09:00:00';
    const newEnd = newBusiness.終了時間 || newBusiness.end_time || '17:00:00';
    const newHours = this.calculateShiftHours(newStart, newEnd);
    totalHours += newHours;

    console.log(`📊 [RULE_ENGINE] Daily hours check: ${employeeId} - ${totalHours.toFixed(1)}h / ${maxHours}h`);

    if (totalHours > maxHours) {
      return {
        passed: false,
        rule_name: '1日の最大労働時間',
        message: `${employeeId}の1日の労働時間が${totalHours.toFixed(1)}時間となり、上限${maxHours}時間を超過（${businessName}を追加した場合）`,
        details: { totalHours, maxHours, businessName }
      };
    }

    return {
      passed: true,
      rule_name: '1日の最大労働時間',
      details: { totalHours, maxHours }
    };
  }

  /**
   * 排他的業務チェック
   */
  checkExclusiveAssignment(
    employeeId: string,
    newBusinessName: string,
    currentShifts: Shift[],
    targetDate: string
  ): RuleEvaluationResult {
    const exclusiveGroups = this.getExclusiveGroups();

    // 同じ日の同じ従業員のシフトを取得
    const employeeShifts = currentShifts.filter(s => 
      s.employee_id === employeeId && s.shift_date === targetDate
    );

    for (const group of exclusiveGroups) {
      // 新しい業務がこのグループに含まれるか
      const newBusinessInGroup = group.some(name => newBusinessName.includes(name));
      if (!newBusinessInGroup) continue;

      // 既存シフトにこのグループの他の業務があるか
      for (const shift of employeeShifts) {
        const existingName = shift.business_name || shift.business_group || '';
        const existingInGroup = group.some(name => existingName.includes(name));
        
        if (existingInGroup && existingName !== newBusinessName) {
          console.log(`⛔ [RULE_ENGINE] Exclusive assignment violation: ${employeeId} already has ${existingName}, cannot assign ${newBusinessName}`);
          return {
            passed: false,
            rule_name: '点呼業務の排他制約',
            message: `${employeeId}は既に${existingName}が割り当てられているため、${newBusinessName}を割り当てられません`,
            details: { existingBusiness: existingName, newBusiness: newBusinessName, exclusiveGroup: group }
          };
        }
      }
    }

    return {
      passed: true,
      rule_name: '点呼業務の排他制約'
    };
  }

  /**
   * 全ての制約をチェック
   */
  checkAllConstraints(
    employeeId: string,
    newBusiness: any,
    currentShifts: Shift[],
    targetDate: string
  ): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    const businessName = newBusiness.業務名 || newBusiness.name || 'Unknown';

    // 1日の最大労働時間チェック
    results.push(this.checkDailyWorkHours(employeeId, newBusiness, currentShifts, targetDate));

    // 排他的業務チェック
    results.push(this.checkExclusiveAssignment(employeeId, businessName, currentShifts, targetDate));

    return results;
  }

  /**
   * 全ての制約が満たされているかチェック
   */
  canAssign(
    employeeId: string,
    newBusiness: any,
    currentShifts: Shift[],
    targetDate: string
  ): { canAssign: boolean; violations: RuleEvaluationResult[] } {
    const results = this.checkAllConstraints(employeeId, newBusiness, currentShifts, targetDate);
    const violations = results.filter(r => !r.passed);

    return {
      canAssign: violations.length === 0,
      violations
    };
  }

  /**
   * シフト時間を計算（時間単位）
   */
  private calculateShiftHours(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    // 日をまたぐ場合
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  }

  /**
   * ルールキャッシュをクリア
   */
  static clearCache(): void {
    cachedRules = null;
    cacheTimestamp = 0;
    console.log('🗑️ [RULE_ENGINE] Cache cleared');
  }
}

export default RuleEngine;
