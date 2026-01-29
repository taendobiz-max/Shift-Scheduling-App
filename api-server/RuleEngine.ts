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
   * 休暇チェック（非同期）
   */
  async checkVacation(
    employeeId: string,
    targetDate: string
  ): Promise<RuleEvaluationResult> {
    try {
      const { data, error } = await supabase
        .from('vacation_masters')
        .select('employee_id')
        .eq('employee_id', employeeId)
        .eq('vacation_date', targetDate)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ [RULE_ENGINE] Error checking vacation:', error);
        return {
          passed: true, // エラー時はアサインを許可（既存の動作を維持）
          rule_name: '休暇申請者の除外'
        };
      }

      if (data) {
        console.log(`🏖️ [RULE_ENGINE] ${employeeId} is on vacation on ${targetDate}`);
        return {
          passed: false,
          rule_name: '休暇申請者の除外',
          message: `${employeeId}は${targetDate}に休暇申請済みです`,
          details: { employeeId, targetDate }
        };
      }

      return {
        passed: true,
        rule_name: '休暇申請者の除外'
      };
    } catch (err) {
      console.error('❌ [RULE_ENGINE] Unexpected error in checkVacation:', err);
      return {
        passed: true, // エラー時はアサインを許可
        rule_name: '休暇申請者の除外'
      };
    }
  }

  /**
   * 夜行バスの排他制御チェック
   */
  checkOvernightBusExclusion(
    employeeId: string,
    newBusiness: any,
    currentShifts: Shift[],
    targetDate: string,
    allBusinessMasters?: any[]
  ): RuleEvaluationResult {
    // ルール設定を取得
    const rule = this.rules.find(r => 
      r.rule_config?.constraint_type === 'overnight_bus_exclusion'
    );
    
    if (!rule || !rule.is_active) {
      return { passed: true, rule_name: '夜行バスの排他制御' };
    }
    
    const config = rule.rule_config;
    const businessTypes = config.business_types || ['夜行バス（往路）', '夜行バス（復路）'];
    
    // 新しい業務が夜行バスかチェック
    const isNewBusinessOvernight = this.isOvernightBusiness(newBusiness, businessTypes);
    const businessName = newBusiness.業務名 || newBusiness.name || 'Unknown';
    
    // 同じ日の同じ従業員のシフトを取得
    const employeeShifts = currentShifts.filter(s => 
      s.employee_id === employeeId && s.shift_date === targetDate
    );
    
    // 新しい業務が夜行バスの場合、既存シフトがあれば不可
    if (isNewBusinessOvernight && employeeShifts.length > 0) {
      console.log(`🌙 [OVERNIGHT] ${employeeId} - Cannot assign overnight business: already has ${employeeShifts.length} shift(s) on ${targetDate}`);
      return {
        passed: false,
        rule_name: '夜行バスの排他制御',
        message: `${employeeId}は${targetDate}に既に${employeeShifts.length}件のシフトがあるため、夜行バス${businessName}を割り当てられません`,
        details: { 
          businessName, 
          existingShiftsCount: employeeShifts.length,
          reason: '夜行バスは単独で割り当てる必要があります'
        }
      };
    }
    
    // 既存シフトに夜行バスがある場合、新しい業務を割り当て不可
    for (const shift of employeeShifts) {
      if (this.isOvernightShift(shift, allBusinessMasters, businessTypes)) {
        const existingName = shift.business_name || shift.business_group || 'Unknown';
        console.log(`🌙 [OVERNIGHT] ${employeeId} - Cannot assign business: already has overnight shift ${existingName} on ${targetDate}`);
        return {
          passed: false,
          rule_name: '夜行バスの排他制御',
          message: `${employeeId}は${targetDate}に夜行バス${existingName}が割り当てられているため、${businessName}を割り当てられません`,
          details: { 
            businessName, 
            existingOvernightBus: existingName,
            reason: '夜行バスの日は他の業務を割り当てられません'
          }
        };
      }
    }
    
    return {
      passed: true,
      rule_name: '夜行バスの排他制御'
    };
  }

  /**
   * 業務が夜行バスかチェック
   */
  private isOvernightBusiness(
    business: any, 
    businessTypes: string[]
  ): boolean {
    const businessName = business.業務名 || business.name || '';
    const businessType = business.業務タイプ || business.business_type || '';
    
    // 業務タイプベースの判定
    if (businessTypes.includes(businessType)) {
      console.log(`🌙 [OVERNIGHT] Detected overnight business by type: ${businessName} (${businessType})`);
      return true;
    }
    
    return false;
  }

  /**
   * シフトが夜行バスかチェック
   */
  private isOvernightShift(
    shift: Shift,
    allBusinessMasters: any[] | undefined,
    businessTypes: string[]
  ): boolean {
    // business_masterから業務情報を取得
    if (allBusinessMasters) {
      const business = allBusinessMasters.find(b => 
        (b.業務id === shift.business_master_id || b.id === shift.business_master_id) ||
        (b.業務名 === shift.business_name || b.name === shift.business_name)
      );
      if (business) {
        return this.isOvernightBusiness(business, businessTypes);
      }
    }
    
    return false;
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
   * 全ての制約をチェック（非同期）
   */
  async checkAllConstraints(
    employeeId: string,
    newBusiness: any,
    currentShifts: Shift[],
    targetDate: string,
    allBusinessMasters?: any[]
  ): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    const businessName = newBusiness.業務名 || newBusiness.name || 'Unknown';

    // 休暇チェック（最優先）
    const vacationResult = await this.checkVacation(employeeId, targetDate);
    results.push(vacationResult);

    // 夜行バスの排他制御チェック（高優先度）
    results.push(this.checkOvernightBusExclusion(employeeId, newBusiness, currentShifts, targetDate, allBusinessMasters));

    // 1日の最大労働時間チェック
    results.push(this.checkDailyWorkHours(employeeId, newBusiness, currentShifts, targetDate));

    // 排他的業務チェック
    results.push(this.checkExclusiveAssignment(employeeId, businessName, currentShifts, targetDate));

    return results;
  }

  /**
   * 全ての制約が満たされているかチェック（非同期）
   */
  async canAssign(
    employeeId: string,
    newBusiness: any,
    currentShifts: Shift[],
    targetDate: string,
    allBusinessMasters?: any[]
  ): Promise<{ canAssign: boolean; violations: RuleEvaluationResult[] }> {
    const results = await this.checkAllConstraints(employeeId, newBusiness, currentShifts, targetDate, allBusinessMasters);
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
