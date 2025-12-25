/**
 * 制約グループ評価エンジン
 * OR/AND条件で複数の制約をグループ化して評価
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseClient';
import { EnhancedConstraint, ConstraintViolation, ConstraintValidationResult } from '@/types/constraint';
import { validateSplitRest, checkMonthlySplitRestLimit } from './splitRestValidator';

export interface ConstraintGroup {
  id: string;
  group_name: string;
  group_description?: string;
  evaluation_logic: 'OR' | 'AND';
  priority_level: number;
  is_active: boolean;
  constraints?: EnhancedConstraint[];
}

interface Employee {
  id: string;
  name: string;
  location: string;
  employee_id?: string;
}

interface Shift {
  id?: string;
  shift_date: string;
  employee_id: string;
  business_group: string;
  start_time: string;
  end_time: string;
  location?: string;
}

interface ShiftContext {
  existingShifts: Shift[];
  proposedShift: Shift;
}

/**
 * すべての制約グループを取得
 */
export async function getAllConstraintGroups(): Promise<ConstraintGroup[]> {
  try {
    const { data, error } = await supabase
      .from('constraint_groups')
      .select('*')
      .eq('is_active', true)
      .order('priority_level', { ascending: true });
    
    if (error) {
      console.error('❌ [CONSTRAINT_GROUP] Failed to fetch constraint groups:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ [CONSTRAINT_GROUP] Error fetching constraint groups:', error);
    return [];
  }
}

/**
 * 制約グループに所属する制約条件を取得
 */
export async function getConstraintsByGroupId(groupId: string): Promise<EnhancedConstraint[]> {
  try {
    const { data, error } = await supabase
      .from('enhanced_constraints')
      .select('*')
      .eq('constraint_group_id', groupId)
      .eq('is_active', true);
    
    if (error) {
      console.error('❌ [CONSTRAINT_GROUP] Failed to fetch constraints for group:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ [CONSTRAINT_GROUP] Error fetching constraints:', error);
    return [];
  }
}

/**
 * 制約グループの評価
 */
export async function evaluateConstraintGroup(
  group: ConstraintGroup,
  employee: Employee,
  shift: Shift,
  context: ShiftContext,
  constraintEngine: any // ConstraintEngineインスタンス
): Promise<ConstraintValidationResult> {
  
  console.log(`🔍 [GROUP_EVAL] Evaluating group: ${group.group_name} (${group.evaluation_logic})`);
  
  const violations: ConstraintViolation[] = [];
  
  // グループに所属する制約条件を取得
  if (!group.constraints || group.constraints.length === 0) {
    group.constraints = await getConstraintsByGroupId(group.id);
  }
  
  // 各制約条件を評価
  const results: ConstraintValidationResult[] = [];
  
  for (const constraint of group.constraints) {
    const result = constraintEngine.validateShiftAssignment(
      employee,
      shift,
      context.existingShifts
    );
    results.push(result);
  }
  
  // 休息時間グループの場合、分割休息も評価
  const isRestTimeGroup = group.group_name.includes('休息') || 
                          group.group_name.toLowerCase().includes('rest');
  
  if (isRestTimeGroup) {
    const splitRestResult = await evaluateSplitRest(employee, shift, context);
    results.push(splitRestResult);
    console.log(`🔍 [GROUP_EVAL] Split rest evaluation: ${splitRestResult.isValid ? 'PASS' : 'FAIL'}`);
  }
  
  // OR条件: いずれか1つが満たされればOK
  if (group.evaluation_logic === 'OR') {
    const anyValid = results.some(r => r.isValid);
    
    if (!anyValid) {
      // すべての制約が違反している場合のみエラー
      violations.push({
        id: uuidv4(),
        constraint: {
          id: group.id,
          constraint_name: group.group_name,
          constraint_category: 'グループ制約',
          constraint_type: 'constraint_group',
          constraint_value: 0,
          constraint_description: group.group_description || '',
          applicable_locations: [],
          priority_level: group.priority_level,
          enforcement_level: group.priority_level === 0 ? 'mandatory' : 'recommended',
          is_active: true
        } as EnhancedConstraint,
        employee_id: employee.id,
        violation_date: shift.shift_date,
        violation_type: 'constraint_group_violation',
        violation_description: `${group.group_name}のいずれの条件も満たしていません`,
        severity_level: group.priority_level === 0 ? 'critical' : 'warning',
        can_proceed: group.priority_level > 0
      });
    }
    
    return {
      isValid: anyValid,
      violations,
      canProceed: anyValid || group.priority_level > 0
    };
  }
  
  // AND条件: すべて満たす必要がある
  if (group.evaluation_logic === 'AND') {
    const allValid = results.every(r => r.isValid);
    
    if (!allValid) {
      // 違反している制約をすべて記録
      results.forEach(r => {
        if (!r.isValid) {
          violations.push(...r.violations);
        }
      });
    }
    
    return {
      isValid: allValid,
      violations,
      canProceed: allValid || group.priority_level > 0
    };
  }
  
  return { isValid: true, violations: [], canProceed: true };
}

/**
 * 分割休息の評価
 */
async function evaluateSplitRest(
  employee: Employee,
  proposedShift: Shift,
  context: ShiftContext
): Promise<ConstraintValidationResult> {
  
  const violations: ConstraintViolation[] = [];
  const employeeShifts = context.existingShifts.filter(s => s.employee_id === employee.id);
  
  // 前日のシフトを取得
  const proposedDate = new Date(proposedShift.shift_date);
  const previousDay = new Date(proposedDate);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousDayStr = previousDay.toISOString().split('T')[0];
  
  const previousShift = employeeShifts.find(s => s.shift_date === previousDayStr);
  
  if (!previousShift) {
    // 前日のシフトがない場合は評価不要
    return { isValid: true, violations: [], canProceed: true };
  }
  
  // 休息時間を計算
  const previousEndTime = new Date(`${previousShift.shift_date}T${previousShift.end_time}`);
  const proposedStartTime = new Date(`${proposedShift.shift_date}T${proposedShift.start_time}`);
  
  // 分割休息のバリデーション
  const splitRestResult = validateSplitRest(previousEndTime, proposedStartTime);
  
  if (!splitRestResult.isValid) {
    violations.push({
      id: uuidv4(),
      constraint: {
        id: 'split_rest_rule',
        constraint_name: '分割休息ルール',
        constraint_category: '法令遵守',
        constraint_type: 'split_rest',
        constraint_value: 11,
        constraint_description: '連続休息11時間以上、または分割休息（4時間以上×2、合計11時間以上）',
        applicable_locations: [],
        priority_level: 0,
        enforcement_level: 'mandatory',
        is_active: true
      } as EnhancedConstraint,
      employee_id: employee.id,
      violation_date: proposedShift.shift_date,
      violation_type: 'split_rest_violation',
      violation_description: splitRestResult.violations?.join(', ') || '分割休息ルール違反',
      severity_level: 'critical',
      can_proceed: false
    });
    
    return { isValid: false, violations, canProceed: false };
  }
  
  // 分割休息の場合、月間使用回数をチェック
  if (splitRestResult.type === 'split') {
    const monthlyCheck = await checkMonthlySplitRestLimit(
      employee.id,
      new Date(proposedShift.shift_date)
    );
    
    if (!monthlyCheck.isWithinLimit) {
      violations.push({
        id: uuidv4(),
        constraint: {
          id: 'split_rest_monthly_limit',
          constraint_name: '分割休息月間制限',
          constraint_category: '法令遵守',
          constraint_type: 'split_rest_monthly',
          constraint_value: 50,
          constraint_description: '分割休息は月間勤務回数の50%以下',
          applicable_locations: [],
          priority_level: 0,
          enforcement_level: 'mandatory',
          is_active: true
        } as EnhancedConstraint,
        employee_id: employee.id,
        violation_date: proposedShift.shift_date,
        violation_type: 'split_rest_monthly_limit',
        violation_description: `分割休息の月間使用回数が上限を超過（${monthlyCheck.usageCount}/${monthlyCheck.limitCount}回）`,
        severity_level: 'critical',
        can_proceed: false
      });
      
      return { isValid: false, violations, canProceed: false };
    }
  }
  
  return { isValid: true, violations: [], canProceed: true };
}

/**
 * すべての制約グループを評価
 * @param cachedGroups - キャッシュされた制約グループ（オプション）
 */
export async function evaluateAllConstraintGroups(
  employee: Employee,
  shift: Shift,
  context: ShiftContext,
  constraintEngine: any,
  cachedGroups?: ConstraintGroup[]
): Promise<ConstraintValidationResult> {
  
  const allViolations: ConstraintViolation[] = [];
  let canProceed = true;
  
  // キャッシュされたグループを使用、なければ取得
  const groups = cachedGroups || await getAllConstraintGroups();
  
  console.log(`🔍 [GROUP_EVAL] Evaluating ${groups.length} constraint groups`);
  
  // グループが0件の場合は評価をスキップ
  if (groups.length === 0) {
    console.log('🔍 [GROUP_EVAL] No constraint groups to evaluate, skipping');
    return { isValid: true, violations: [], canProceed: true };
  }
  
  for (const group of groups) {
    const result = await evaluateConstraintGroup(
      group,
      employee,
      shift,
      context,
      constraintEngine
    );
    
    if (!result.isValid) {
      allViolations.push(...result.violations);
      
      // 必須グループ（priority_level = 0）が違反している場合は配置不可
      if (group.priority_level === 0 && !result.canProceed) {
        canProceed = false;
      }
    }
  }
  
  return {
    isValid: allViolations.length === 0,
    violations: allViolations,
    canProceed
  };
}

