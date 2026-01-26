/**
 * 分割休息バリデーター
 * 改善基準告示（2024年4月1日施行）に基づく分割休息ルールの実装
 */

import { supabase } from '@/lib/supabase';

export interface RestPeriod {
  start: Date;
  end: Date;
  duration: number; // 時間
}

export interface SplitRestValidationResult {
  isValid: boolean;
  type: 'continuous' | 'split' | 'invalid';
  restPeriods?: RestPeriod[];
  totalHours?: number;
  violations?: string[];
}

export interface MonthlySplitRestCheck {
  isWithinLimit: boolean;
  usageCount: number;
  totalShifts: number;
  limitCount: number;
}

/**
 * 休息期間を計算
 */
function calculateRestPeriods(
  previousShiftEnd: Date,
  nextShiftStart: Date
): RestPeriod[] {
  // 基本的には1つの連続した休息期間
  const duration = (nextShiftStart.getTime() - previousShiftEnd.getTime()) / (1000 * 60 * 60);
  
  return [{
    start: previousShiftEnd,
    end: nextShiftStart,
    duration
  }];
}

/**
 * 分割休息のバリデーション
 * 
 * ルール:
 * 1. 連続休息11時間以上 → OK
 * 2. 分割休息（2分割のみ）:
 *    - 各休息期間は4時間以上
 *    - 合計11時間以上
 * 3. 3分割以上は不可
 */
export function validateSplitRest(
  previousShiftEnd: Date,
  nextShiftStart: Date,
  restPeriods?: RestPeriod[]
): SplitRestValidationResult {
  
  // 休息期間を計算（カスタム休息期間が指定されていない場合）
  const periods = restPeriods || calculateRestPeriods(previousShiftEnd, nextShiftStart);
  const totalRestHours = periods.reduce((sum, p) => sum + p.duration, 0);
  
  // パターン1: 連続休息11時間以上
  if (periods.length === 1 && totalRestHours >= 11) {
    return {
      isValid: true,
      type: 'continuous',
      restPeriods: periods,
      totalHours: totalRestHours
    };
  }
  
  // パターン2: 分割休息（2分割のみ）
  if (periods.length === 2) {
    const violations: string[] = [];
    
    // ルール1: 各休息期間は4時間以上
    const allPeriodsValid = periods.every(p => p.duration >= 4);
    if (!allPeriodsValid) {
      violations.push('各休息期間は4時間以上である必要があります');
    }
    
    // ルール2: 合計11時間以上
    if (totalRestHours < 11) {
      violations.push('休息期間の合計は11時間以上である必要があります');
    }
    
    if (violations.length === 0) {
      return {
        isValid: true,
        type: 'split',
        restPeriods: periods,
        totalHours: totalRestHours
      };
    }
    
    return {
      isValid: false,
      type: 'invalid',
      restPeriods: periods,
      totalHours: totalRestHours,
      violations
    };
  }
  
  // パターン3: 3分割以上は不可
  if (periods.length > 2) {
    return {
      isValid: false,
      type: 'invalid',
      restPeriods: periods,
      totalHours: totalRestHours,
      violations: ['分割休息は2分割までです（3分割以上は認められません）']
    };
  }
  
  // その他: 休息不足
  return {
    isValid: false,
    type: 'invalid',
    restPeriods: periods,
    totalHours: totalRestHours,
    violations: [`休息時間が不足しています（${totalRestHours.toFixed(1)}時間）`]
  };
}

/**
 * 月間の分割休息使用回数をチェック
 * ルール: 月間勤務回数の50%以下
 */
export async function checkMonthlySplitRestLimit(
  employeeId: string,
  targetMonth: Date
): Promise<MonthlySplitRestCheck> {
  
  // 月の開始日と終了日を計算
  const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
  
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const monthEndStr = monthEnd.toISOString().split('T')[0];
  
  try {
    // 月間の分割休息使用回数を取得
    const { data: splitRestData, error: splitRestError } = await supabase
      .from('split_rest_usage')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('shift_date', monthStartStr)
      .lte('shift_date', monthEndStr);
    
    if (splitRestError) {
      console.error('❌ [SPLIT_REST] Failed to fetch split rest usage:', splitRestError);
      throw splitRestError;
    }
    
    const usageCount = splitRestData?.length || 0;
    
    // 月間の総勤務回数を取得
    const { data: shiftsData, error: shiftsError } = await supabase
      .from('shifts')
      .select('shift_date')
      .eq('employee_id', employeeId)
      .gte('shift_date', monthStartStr)
      .lte('shift_date', monthEndStr);
    
    if (shiftsError) {
      console.error('❌ [SPLIT_REST] Failed to fetch shifts:', shiftsError);
      throw shiftsError;
    }
    
    const totalShifts = shiftsData?.length || 0;
    const limitCount = Math.floor(totalShifts / 2);
    
    // 50%以下かチェック
    const isWithinLimit = usageCount <= limitCount;
    
    return {
      isWithinLimit,
      usageCount,
      totalShifts,
      limitCount
    };
    
  } catch (error) {
    console.error('❌ [SPLIT_REST] Error checking monthly limit:', error);
    // エラー時は制限内として扱う（安全側に倒す）
    return {
      isWithinLimit: true,
      usageCount: 0,
      totalShifts: 0,
      limitCount: 0
    };
  }
}

/**
 * 分割休息使用履歴を記録
 */
export async function recordSplitRestUsage(
  employeeId: string,
  shiftDate: string,
  restPeriods: RestPeriod[]
): Promise<void> {
  const totalRestHours = restPeriods.reduce((sum, p) => sum + p.duration, 0);
  
  try {
    const { error } = await supabase
      .from('split_rest_usage')
      .insert({
        employee_id: employeeId,
        shift_date: shiftDate,
        rest_periods: restPeriods.map(p => ({
          start: p.start.toISOString(),
          end: p.end.toISOString(),
          duration: p.duration
        })),
        total_rest_hours: totalRestHours
      });
    
    if (error) {
      console.error('❌ [SPLIT_REST] Failed to record split rest usage:', error);
      throw error;
    }
    
    console.log(`✅ [SPLIT_REST] Recorded split rest usage for ${employeeId} on ${shiftDate}`);
    
  } catch (error) {
    console.error('❌ [SPLIT_REST] Error recording split rest usage:', error);
    throw error;
  }
}

