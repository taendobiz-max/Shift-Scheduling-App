/**
 * 複数日業務のハンドラー
 * generateShiftsForSingleDate関数に統合される
 */

import {
  BusinessMaster,
  MultiDayBusinessConfig,
  DaySchedule,
  isMultiDayBusiness,
  isApplicableDate,
  addDays,
  generateMultiDaySetId
} from './multi-day-business-types';

export interface MultiDayAssignmentResult {
  shifts: any[];
  assignedEmployeeId: string;
  businessSetId: string;
  startDate: string;
  endDate: string;
}

/**
 * 複数日業務を処理
 * @param business 業務マスタ
 * @param startDate 開始日
 * @param availableEmployees 利用可能な従業員リスト
 * @param batchId バッチID
 * @param employeeSkillMatrix スキルマトリックス
 * @param ruleFilteredEmployees ルールフィルタリング済み従業員
 * @returns 割り当て結果
 */
export async function assignMultiDayBusiness(
  business: BusinessMaster,
  startDate: string,
  availableEmployees: any[],
  batchId: string,
  employeeSkillMatrix: Map<string, Set<string>>,
  ruleFilteredEmployees: any[]
): Promise<MultiDayAssignmentResult | null> {
  
  if (!isMultiDayBusiness(business)) {
    return null;
  }
  
  const config = business.multi_day_config!;
  
  console.log(`\n🔄 [MULTI-DAY] Processing ${business.業務名} (${config.duration_days} days)`);
  
  // 適用日チェック
  if (!isApplicableDate(business, startDate)) {
    console.log(`  ⏭️  Skipped: Not applicable for ${startDate}`);
    return null;
  }
  
  // スキルチェック
  const businessGroup = business.業務グループ || business.business_group;
  
  console.log(`  🔍 [DEBUG] Filtering for ${business.業務名}`);
  console.log(`    Total employees: ${ruleFilteredEmployees.length}`);
  console.log(`    Required business_group: ${businessGroup}`);
  console.log(`    Required team: ${config.rotation_rule?.team_filter || 'none'}`);
  
  const eligibleEmployees = ruleFilteredEmployees.filter(emp => {
    const empId = emp.employee_id || emp.従業員ID || emp.id;
    const skills = employeeSkillMatrix.get(empId);
    
    if (!skills || !skills.has(businessGroup)) {
      return false;
    }
    
    // 班指定チェック
    if (config.rotation_rule?.team_filter) {
      const empTeam = emp.班 || emp.team || emp.所属班;
      if (empTeam !== config.rotation_rule.team_filter) {
        return false;
      }
    }
    
    return true;
  });
  
  console.log(`    Eligible after filtering: ${eligibleEmployees.length}`);
  if (eligibleEmployees.length > 0) {
    const first = eligibleEmployees[0];
    console.log(`    First eligible: ${first.name || first.氏名} (班: ${first.班 || 'none'})`);
  }
  
  if (eligibleEmployees.length === 0) {
    console.log(`  ❌ No eligible employees for ${business.業務名}`);
    return null;
  }
  
  // 従業員を選択（最初の適格者）
  const selectedEmployee = eligibleEmployees[0];
  const empId = selectedEmployee.employee_id || selectedEmployee.従業員ID || selectedEmployee.id;
  const empName = selectedEmployee.name || selectedEmployee.氏名 || selectedEmployee.従業員名;
  
  console.log(`  ✅ Selected employee: ${empName} (${empId})`);
  
  // 各日のシフトを生成
  const shifts: any[] = [];
  const businessSetId = generateMultiDaySetId(business.業務id, startDate);
  
  for (const daySchedule of config.day_schedules) {
    const shiftDate = addDays(startDate, daySchedule.date_offset);
    const businessName = `${business.業務名}${daySchedule.business_name_suffix || ''}`;
    
    const shift = {
      id: `${businessSetId}_day${daySchedule.day}`,
      date: shiftDate,
      employee_id: empId,
      employee_name: empName,
      business_group: businessGroup,
      business_name: businessName,
      business_master_id: business.業務id,
      shift_type: business.業務タイプ || 'multi_day',
      start_time: daySchedule.start_time,
      end_time: daySchedule.end_time,
      status: 'assigned',
      generation_batch_id: batchId,
      location: business.営業所 || business.location,
      multi_day_set_id: businessSetId,
      multi_day_info: {
        day: daySchedule.day,
        total_days: config.duration_days,
        direction: daySchedule.direction
      }
    };
    
    shifts.push(shift);
    console.log(`    Day ${daySchedule.day}: ${shiftDate} ${daySchedule.start_time}-${daySchedule.end_time} (${daySchedule.direction || 'N/A'})`);
  }
  
  const endDate = addDays(startDate, config.duration_days - 1);
  
  return {
    shifts,
    assignedEmployeeId: empId,
    businessSetId,
    startDate,
    endDate
  };
}

/**
 * 複数日業務セットが既に割り当てられているかチェック
 */
export function isMultiDaySetAlreadyAssigned(
  businessSetId: string,
  assignedSets: Set<string>
): boolean {
  return assignedSets.has(businessSetId);
}

/**
 * 従業員が複数日業務の期間中に他の業務を持っているかチェック
 */
export function hasConflictingShifts(
  employeeId: string,
  startDate: string,
  endDate: string,
  existingShifts: any[]
): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return existingShifts.some(shift => {
    if (shift.employee_id !== employeeId) {
      return false;
    }
    
    const shiftDate = new Date(shift.date || shift.shift_date);
    return shiftDate >= start && shiftDate <= end;
  });
}
