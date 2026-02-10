import { supabase } from '@/lib/supabase';
import { validateSplitRest, checkMonthlySplitRestLimit } from './splitRestValidator';

export interface RuleViolation {
  type: 'time_conflict' | 'rest_time' | 'consecutive_days' | 'split_rest' | 'constraint' | 'roll_call_missing';
  severity: 'error' | 'warning';
  date: string;
  employeeName: string;
  employeeId: string;
  description: string;
  details?: string;
}

export interface RuleCheckResult {
  violations: RuleViolation[];
  totalViolations: number;
  errorCount: number;
  warningCount: number;
}

/**
 * シフト管理画面のシフトデータに対してルールチェックを実行
 */
export async function checkShiftRules(
  shifts: any[],
  location?: string
): Promise<RuleCheckResult> {
  const violations: RuleViolation[] = [];
  
  console.log('🔍 [RULE_CHECK] Starting rule check for', shifts.length, 'shifts');
  
  // 1. 時間重複チェック
  const timeConflicts = checkTimeConflicts(shifts);
  violations.push(...timeConflicts);
  
  // 2. 休息時間チェック
  const restTimeViolations = await checkRestTime(shifts);
  violations.push(...restTimeViolations);
  
  // 3. 連続勤務日数チェック
  const consecutiveDaysViolations = await checkConsecutiveDays(shifts);
  violations.push(...consecutiveDaysViolations);
  
  // 4. 分割休息チェック
  const splitRestViolations = await checkSplitRest(shifts);
  violations.push(...splitRestViolations);
  
  // 5. 点呼対応者チェック
  const rollCallViolations = await checkRollCallAssignment(shifts);
  violations.push(...rollCallViolations);
  
  // 6. 制約エンジンによるチェック (統合シフトルール管理に移行済み)
  // const constraintViolations = await checkConstraints(shifts, location);
  // violations.push(...constraintViolations);
  
  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;
  
  console.log('✅ [RULE_CHECK] Rule check completed:', {
    total: violations.length,
    errors: errorCount,
    warnings: warningCount
  });
  
  return {
    violations,
    totalViolations: violations.length,
    errorCount,
    warningCount
  };
}

/**
 * 時間重複チェック
 */
function checkTimeConflicts(shifts: any[]): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const shiftsByEmployee = new Map<string, any[]>();
  
  // 従業員ごとにシフトをグループ化
  shifts.forEach(shift => {
    const empId = shift.employee_id || shift.従業員ID;
    if (!shiftsByEmployee.has(empId)) {
      shiftsByEmployee.set(empId, []);
    }
    shiftsByEmployee.get(empId)!.push(shift);
  });
  
  // 各従業員のシフトをチェック
  shiftsByEmployee.forEach((empShifts, empId) => {
    const shiftsByDate = new Map<string, any[]>();
    
    // 日付ごとにグループ化
    empShifts.forEach(shift => {
      const date = shift.shift_date || shift.date;
      if (!shiftsByDate.has(date)) {
        shiftsByDate.set(date, []);
      }
      shiftsByDate.get(date)!.push(shift);
    });
    
    // 同じ日に複数シフトがある場合、時間重複をチェック
    shiftsByDate.forEach((dayShifts, date) => {
      if (dayShifts.length > 1) {
        for (let i = 0; i < dayShifts.length; i++) {
          for (let j = i + 1; j < dayShifts.length; j++) {
            const shift1 = dayShifts[i];
            const shift2 = dayShifts[j];
            
            if (isTimeOverlap(shift1, shift2)) {
              violations.push({
                type: 'time_conflict',
                severity: 'error',
                date,
                employeeName: shift1.employee_name || shift1.従業員名 || empId,
                employeeId: empId,
                description: '時間重複',
                details: `${shift1.business_name || shift1.業務名} (${shift1.start_time}-${shift1.end_time}) と ${shift2.business_name || shift2.業務名} (${shift2.start_time}-${shift2.end_time}) が重複しています`
              });
            }
          }
        }
      }
    });
  });
  
  return violations;
}

/**
 * 時間重複判定
 */
function isTimeOverlap(shift1: any, shift2: any): boolean {
  const start1 = shift1.start_time || shift1.開始時間;
  const end1 = shift1.end_time || shift1.終了時間;
  const start2 = shift2.start_time || shift2.開始時間;
  const end2 = shift2.end_time || shift2.終了時間;
  
  if (!start1 || !end1 || !start2 || !end2) return false;
  
  return (start1 < end2 && end1 > start2);
}

/**
 * 休息時間チェック（11時間以上の休息が必要）
 */
async function checkRestTime(shifts: any[]): Promise<RuleViolation[]> {
  const violations: RuleViolation[] = [];
  const MIN_REST_HOURS = 11;
  
  // 従業員ごとにシフトをグループ化
  const shiftsByEmployee = new Map<string, any[]>();
  shifts.forEach(shift => {
    const empId = shift.employee_id || shift.従業員ID;
    if (!shiftsByEmployee.has(empId)) {
      shiftsByEmployee.set(empId, []);
    }
    shiftsByEmployee.get(empId)!.push(shift);
  });
  
  // 各従業員のシフトを日付順にソート
  shiftsByEmployee.forEach((empShifts, empId) => {
    const sortedShifts = empShifts.sort((a, b) => {
      const dateA = a.shift_date || a.date;
      const dateB = b.shift_date || b.date;
      return dateA.localeCompare(dateB);
    });
    
    // 連続する日のシフトをチェック
    for (let i = 0; i < sortedShifts.length - 1; i++) {
      const currentShift = sortedShifts[i];
      const nextShift = sortedShifts[i + 1];
      
      const currentDate = currentShift.shift_date || currentShift.date;
      const nextDate = nextShift.shift_date || nextShift.date;
      
      // 翌日のシフトかチェック
      const currentDateObj = new Date(currentDate);
      const nextDateObj = new Date(nextDate);
      const dayDiff = (nextDateObj.getTime() - currentDateObj.getTime()) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        // 休息時間を計算
        const currentEndTime = currentShift.end_time || currentShift.終了時間;
        const nextStartTime = nextShift.start_time || nextShift.開始時間;
        
        if (currentEndTime && nextStartTime) {
          const restHours = calculateRestHours(currentDate, currentEndTime, nextDate, nextStartTime);
          
          if (restHours < MIN_REST_HOURS) {
            violations.push({
              type: 'rest_time',
              severity: 'error',
              date: nextDate,
              employeeName: currentShift.employee_name || currentShift.従業員名 || empId,
              employeeId: empId,
              description: '休息時間不足',
              details: `${currentDate} ${currentEndTime} 〜 ${nextDate} ${nextStartTime} の休息時間が${restHours.toFixed(1)}時間（最低${MIN_REST_HOURS}時間必要）`
            });
          }
        }
      }
    }
  });
  
  return violations;
}

/**
 * 休息時間を計算（時間単位）
 */
function calculateRestHours(date1: string, time1: string, date2: string, time2: string): number {
  const dt1 = new Date(`${date1}T${time1}`);
  const dt2 = new Date(`${date2}T${time2}`);
  return (dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60);
}

/**
 * 連続勤務日数チェック
 */
async function checkConsecutiveDays(shifts: any[]): Promise<RuleViolation[]> {
  const violations: RuleViolation[] = [];
  // TODO: 制約マスタから連続勤務日数の上限を取得
  const MAX_CONSECUTIVE_DAYS = 7; // 仮の値
  
  // 従業員ごとにシフトをグループ化
  const shiftsByEmployee = new Map<string, any[]>();
  shifts.forEach(shift => {
    const empId = shift.employee_id || shift.従業員ID;
    if (!shiftsByEmployee.has(empId)) {
      shiftsByEmployee.set(empId, []);
    }
    shiftsByEmployee.get(empId)!.push(shift);
  });
  
  // 各従業員の連続勤務日数をチェック
  shiftsByEmployee.forEach((empShifts, empId) => {
    const sortedShifts = empShifts.sort((a, b) => {
      const dateA = a.shift_date || a.date;
      const dateB = b.shift_date || b.date;
      return dateA.localeCompare(dateB);
    });
    
    let consecutiveDays = 1;
    let startDate = sortedShifts[0]?.shift_date || sortedShifts[0]?.date;
    
    for (let i = 1; i < sortedShifts.length; i++) {
      const prevDate = sortedShifts[i - 1].shift_date || sortedShifts[i - 1].date;
      const currentDate = sortedShifts[i].shift_date || sortedShifts[i].date;
      
      const prevDateObj = new Date(prevDate);
      const currentDateObj = new Date(currentDate);
      const dayDiff = (currentDateObj.getTime() - prevDateObj.getTime()) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        consecutiveDays++;
        
        if (consecutiveDays > MAX_CONSECUTIVE_DAYS) {
          violations.push({
            type: 'consecutive_days',
            severity: 'warning',
            date: currentDate,
            employeeName: sortedShifts[i].employee_name || sortedShifts[i].従業員名 || empId,
            employeeId: empId,
            description: '連続勤務日数超過',
            details: `${startDate} から ${currentDate} まで${consecutiveDays}日連続勤務（上限${MAX_CONSECUTIVE_DAYS}日）`
          });
        }
      } else {
        consecutiveDays = 1;
        startDate = currentDate;
      }
    }
  });
  
  return violations;
}

/**
 * 分割休息チェック
 * 
 * ルール:
 * 1. 連続休息11時間以上 → OK
 * 2. 分割休息（2分割のみ）:
 *    - 各休息期間は4時間以上
 *    - 合計11時間以上
 *    - 月間勤務回数の50%以下
 * 3. 3分割以上は不可
 */
async function checkSplitRest(shifts: any[]): Promise<RuleViolation[]> {
  const violations: RuleViolation[] = [];
  
  // 従業員ごとにシフトをグループ化
  const shiftsByEmployee = new Map<string, any[]>();
  shifts.forEach(shift => {
    const empId = shift.employee_id || shift.従業員ID;
    if (!shiftsByEmployee.has(empId)) {
      shiftsByEmployee.set(empId, []);
    }
    shiftsByEmployee.get(empId)!.push(shift);
  });
  
  // 各従業員のシフトを日付順にソート
  for (const [empId, empShifts] of shiftsByEmployee.entries()) {
    const sortedShifts = empShifts.sort((a, b) => {
      const dateA = a.shift_date || a.date;
      const dateB = b.shift_date || b.date;
      return dateA.localeCompare(dateB);
    });
    
    // 連続する日のシフトをチェック
    for (let i = 0; i < sortedShifts.length - 1; i++) {
      const currentShift = sortedShifts[i];
      const nextShift = sortedShifts[i + 1];
      
      const currentDate = currentShift.shift_date || currentShift.date;
      const nextDate = nextShift.shift_date || nextShift.date;
      
      // 翌日のシフトかチェック
      const currentDateObj = new Date(currentDate);
      const nextDateObj = new Date(nextDate);
      const dayDiff = (nextDateObj.getTime() - currentDateObj.getTime()) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        // 休息時間を計算
        const currentEndTime = currentShift.end_time || currentShift.終了時間;
        const nextStartTime = nextShift.start_time || nextShift.開始時間;
        
        if (currentEndTime && nextStartTime) {
          const previousShiftEnd = new Date(`${currentDate}T${currentEndTime}`);
          const nextShiftStart = new Date(`${nextDate}T${nextStartTime}`);
          
          // 分割休息のバリデーション
          const validationResult = validateSplitRest(previousShiftEnd, nextShiftStart);
          
          if (!validationResult.isValid) {
            const violationDetails = validationResult.violations?.join('、') || '休息時間が不足しています';
            
            violations.push({
              type: 'split_rest',
              severity: 'error',
              date: nextDate,
              employeeName: currentShift.employee_name || currentShift.従業員名 || empId,
              employeeId: empId,
              description: '分割休息ルール違反',
              details: `${currentDate} ${currentEndTime} 〜 ${nextDate} ${nextStartTime}: ${violationDetails}`
            });
          } else if (validationResult.type === 'split') {
            // 分割休息を使用している場合、月間使用回数をチェック
            try {
              const targetMonth = new Date(nextDate);
              const monthlyCheck = await checkMonthlySplitRestLimit(empId, targetMonth);
              
              if (!monthlyCheck.isWithinLimit) {
                violations.push({
                  type: 'split_rest',
                  severity: 'error',
                  date: nextDate,
                  employeeName: currentShift.employee_name || currentShift.従業員名 || empId,
                  employeeId: empId,
                  description: '分割休息の月間使用回数超過',
                  details: `${targetMonth.getFullYear()}年${targetMonth.getMonth() + 1}月の使用回数: ${monthlyCheck.usageCount}回（上限: ${monthlyCheck.limitCount}回、総勤務回数の50%）`
                });
              }
            } catch (error) {
              console.error('❌ [RULE_CHECK] Failed to check monthly split rest limit:', error);
              // エラー時は警告として記録
              violations.push({
                type: 'split_rest',
                severity: 'warning',
                date: nextDate,
                employeeName: currentShift.employee_name || currentShift.従業員名 || empId,
                employeeId: empId,
                description: '分割休息の月間使用回数チェックエラー',
                details: '月間使用回数の確認に失敗しました'
              });
            }
          }
        }
      }
    }
  }
  
  return violations;
}

/**
 * 制約エンジンを使用した制約チェック (統合シフトルール管理に移行済み)
 * このレガシー関数は削除予定
 */
// async function checkConstraints(shifts: any[], location?: string): Promise<RuleViolation[]> {
//   const violations: RuleViolation[] = [];
//   return violations;
// }

/**
 * 点呼対応者チェック
 * 各日に点呼業務が割り当てられているか、および点呼スキルを持つ従業員がアサインされているかを確認
 */
async function checkRollCallAssignment(shifts: any[]): Promise<RuleViolation[]> {
  const violations: RuleViolation[] = [];
  
  console.log('📞 [ROLL_CALL_CHECK] Starting roll call assignment check');
  
  // business_masterテーブルから点呼業務を取得
  const { data: businessMasters, error: businessError } = await supabase
    .from('business_master')
    .select('業務id, 業務名');
  
  if (businessError) {
    console.error('❌ [ROLL_CALL_CHECK] Failed to fetch business_master:', businessError);
    return violations;
  }
  
  // 点呼業務のIDセットを作成（業務名に「点呼」が含まれるもの）
  const rollCallBusinessIds = new Set(
    businessMasters
      ?. filter(b => b.業務名?. includes('点呼'))
      .map(b => b.業務id) || []  // shifts.business_idはbusiness_master.業務id (文字列コード)を参照している
  );
  
  console.log(`📞 [ROLL_CALL_CHECK] Found ${rollCallBusinessIds.size} roll call businesses`);
  
  // employeesテーブルから従業員情報を取得
  const { data: employees, error: employeeError } = await supabase
    .from('employees')
    .select('employee_id, name, roll_call_capable');
  
  if (employeeError) {
    console.error('❌ [ROLL_CALL_CHECK] Failed to fetch employees:', employeeError);
    return violations;
  }
  
  // 従業員IDから従業員情報へのマップを作成
  const employeeMap = new Map(
    employees?.map(e => [e.employee_id, e]) || []
  );
  
  // 日付ごとにシフトをグループ化
  const shiftsByDate = new Map<string, any[]>();
  for (const shift of shifts) {
    const date = shift.shift_date || shift.date || shift.日付;
    if (!date) continue;
    
    if (!shiftsByDate.has(date)) {
      shiftsByDate.set(date, []);
    }
    shiftsByDate.get(date)!.push(shift);
  }
  
  // 各日付で点呼業務がアサインされているかチェック
  for (const [date, dayShifts] of shiftsByDate.entries()) {
    // 点呼業務のシフトを抽出
    const rollCallShifts = dayShifts.filter(shift => {
      const businessId = shift.business_id || shift.business_master_id || shift.業務id;
      return rollCallBusinessIds.has(businessId);
    });
    
    if (rollCallShifts.length === 0) {
      // 点呼業務がアサインされていない場合、エラーとして記録
      violations.push({
        type: 'roll_call_missing',
        severity: 'error',
        date: date,
        employeeName: '（未アサイン）',
        employeeId: '',
        description: '点呼対応者未アサイン',
        details: `${date}に点呼対応者が割り当てられていません。法令上、点呼対応者は必須です。`
      });
      
      console.log(`❌ [ROLL_CALL_CHECK] Missing roll call assignment on ${date}`);
    } else {
      console.log(`✅ [ROLL_CALL_CHECK] Roll call assigned on ${date}`);
      
      // 点呼業務にアサインされた従業員のスキルをチェック
      for (const shift of rollCallShifts) {
        const employeeId = shift.employee_id;
        const employee = employeeMap.get(employeeId);
        
        if (!employee) {
          console.warn(`⚠️ [ROLL_CALL_CHECK] Employee ${employeeId} not found`);
          continue;
        }
        
        // 点呼スキルがない場合、エラーとして記録
        if (!employee.roll_call_capable) {
          const businessName = businessMasters?.find(b => b.業務id === (shift.business_id || shift.business_master_id || shift.業務id))?.業務名 || '不明な業務';
          
          violations.push({
            type: 'roll_call_skill_missing',
            severity: 'error',
            date: date,
            employeeName: employee.name,
            employeeId: employeeId,
            description: '点呼スキル不足',
            details: `${employee.name}さんは点呼業務「${businessName}」にアサインされていますが、点呼スキルを持っていません。`
          });
          
          console.log(`❌ [ROLL_CALL_CHECK] Employee ${employee.name} (${employeeId}) lacks roll call skill on ${date}`);
        } else {
          console.log(`✅ [ROLL_CALL_CHECK] Employee ${employee.name} (${employeeId}) has roll call skill on ${date}`);
        }
      }
    }
  }
  
  console.log(`📞 [ROLL_CALL_CHECK] Check completed: ${violations.length} violations found`);
  
  return violations;
}
