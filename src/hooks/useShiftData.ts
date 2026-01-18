import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SwapOperation } from '../types/shift';

interface SwapResult {
  success: boolean;
  error?: string;
}

export const useShiftData = () => {
  const [isSwapping, setIsSwapping] = useState(false);

  // シフトを入れ替える
  const swapShifts = useCallback(async (operation: SwapOperation): Promise<SwapResult> => {
    setIsSwapping(true);
    try {
      const { from, to } = operation;

      console.log('🔄 [SWAP] Starting swap operation:', { from, to });

      // 1. fromのシフトを取得
      let fromShift = null;
      let fromError = null;
      
      // from.businessIdが空の場合は空セルなのでシフトはない
      if (from.businessId && from.shiftId) {
        const result = await supabase
          .from('shifts')
          .select('*')
          .eq('id', from.shiftId)
          .maybeSingle();
        fromShift = result.data;
        fromError = result.error;
      }

      if (fromError) {
        console.error('❌ [SWAP] Error fetching from shift:', fromError);
        return { success: false, error: `入れ替え元のシフト取得に失敗しました: ${fromError.message}` };
      }

      // 2. toのシフトを取得
      let toShift = null;
      let toError = null;
      
      // to.businessIdが空の場合は空セルなのでシフトはない
      if (to.businessId && to.shiftId) {
        const result = await supabase
          .from('shifts')
          .select('*')
          .eq('id', to.shiftId)
          .maybeSingle();
        toShift = result.data;
        toError = result.error;
      }

      if (toError) {
        console.error('❌ [SWAP] Error fetching to shift:', toError);
        return { success: false, error: `入れ替え先のシフト取得に失敗しました: ${toError.message}` };
      }

      console.log('📊 [SWAP] Shifts found:', { fromShift: !!fromShift, toShift: !!toShift });

      // 3. バリデーション: スキルチェック
      const skillCheckResult = await validateSkills(from, to, fromShift, toShift);
      if (!skillCheckResult.valid) {
        console.warn('⚠️ [SWAP] Skill validation failed:', skillCheckResult.error);
        return { success: false, error: skillCheckResult.error };
      }

      // 4. バリデーション: 時間重複チェック
      const timeOverlapResult = await validateTimeOverlap(from, to, fromShift, toShift);
      if (!timeOverlapResult.valid) {
        console.warn('⚠️ [SWAP] Time overlap validation failed:', timeOverlapResult.error);
        return { success: false, error: timeOverlapResult.error };
      }

      // 5. 入れ替え処理
      if (fromShift && toShift) {
        // 両方にシフトがある場合：employee_idを入れ替え
        console.log('🔄 [SWAP] Swapping both shifts');
        const { error: updateFromError } = await supabase
          .from('shifts')
          .update({ employee_id: toShift.employee_id })
          .eq('id', fromShift.id);

        if (updateFromError) {
          console.error('❌ [SWAP] Error updating from shift:', updateFromError);
          return { success: false, error: `入れ替え元のシフト更新に失敗しました: ${updateFromError.message}` };
        }

        const { error: updateToError } = await supabase
          .from('shifts')
          .update({ employee_id: fromShift.employee_id })
          .eq('id', toShift.id);

        if (updateToError) {
          console.error('❌ [SWAP] Error updating to shift:', updateToError);
          return { success: false, error: `入れ替え先のシフト更新に失敗しました: ${updateToError.message}` };
        }
      } else if (fromShift && !toShift) {
        // fromにのみシフトがある場合：toの空セルに移動
        console.log('🔄 [SWAP] Moving from shift to empty cell');
        
        // 空セルの場合は、従業員IDのみを更新（同じ業務、同じ日付で従業員だけ変更）
        const { error: updateError } = await supabase
          .from('shifts')
          .update({ employee_id: to.employeeId })
          .eq('id', fromShift.id);

        if (updateError) {
          console.error('❌ [SWAP] Error moving from shift:', updateError);
          return { success: false, error: `シフトの移動に失敗しました: ${updateError.message}` };
        }
      } else if (!fromShift && toShift) {
        // toにのみシフトがある場合：fromの空セルに移動
        console.log('🔄 [SWAP] Moving to shift to empty cell');
        
        // 空セルの場合は、従業員IDのみを更新（同じ業務、同じ日付で従業員だけ変更）
        const { error: updateError } = await supabase
          .from('shifts')
          .update({ employee_id: from.employeeId })
          .eq('id', toShift.id);

        if (updateError) {
          console.error('❌ [SWAP] Error moving to shift:', updateError);
          return { success: false, error: `シフトの移動に失敗しました: ${updateError.message}` };
        }
      } else {
        // 両方nullの場合は何もしない
        console.log('ℹ️ [SWAP] Both shifts are null, nothing to swap');
        return { success: false, error: '入れ替えるシフトがありません' };
      }

      console.log('✅ [SWAP] Swap completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ [SWAP] Unexpected error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      return { success: false, error: `シフトの入れ替えに失敗しました: ${errorMessage}` };
    } finally {
      setIsSwapping(false);
    }
  }, []);

  return {
    swapShifts,
    isSwapping,
  };
};

// スキルチェック
async function validateSkills(
  from: any,
  to: any,
  fromShift: any,
  toShift: any
): Promise<{ valid: boolean; error?: string }> {
  try {
    // fromのシフトがある場合、toの従業員がfromの業務に必要なスキルを持っているかチェック
    if (fromShift) {
      const { data: toSkills, error: toSkillsError } = await supabase
        .from('skill_matrix')
        .select('skill_level')
        .eq('employee_id', to.employeeId)
        .eq('business_id', from.businessId)
        .maybeSingle();

      if (toSkillsError) {
        console.error('Error fetching to skills:', toSkillsError);
        return { valid: false, error: 'スキル情報の取得に失敗しました' };
      }

      if (!toSkills || toSkills.skill_level === 0) {
        return { valid: false, error: `${to.employeeName}さんは${from.businessName}のスキルがありません` };
      }
    }

    // toのシフトがある場合、fromの従業員がtoの業務に必要なスキルを持っているかチェック
    if (toShift) {
      const { data: fromSkills, error: fromSkillsError } = await supabase
        .from('skill_matrix')
        .select('skill_level')
        .eq('employee_id', from.employeeId)
        .eq('business_id', to.businessId)
        .maybeSingle();

      if (fromSkillsError) {
        console.error('Error fetching from skills:', fromSkillsError);
        return { valid: false, error: 'スキル情報の取得に失敗しました' };
      }

      if (!fromSkills || fromSkills.skill_level === 0) {
        return { valid: false, error: `${from.employeeName}さんは${to.businessName}のスキルがありません` };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('Error in validateSkills:', error);
    return { valid: false, error: 'スキルチェック中にエラーが発生しました' };
  }
}

// 時間重複チェック
async function validateTimeOverlap(
  from: any,
  to: any,
  fromShift: any,
  toShift: any
): Promise<{ valid: boolean; error?: string }> {
  try {
    // fromのシフトがある場合、toの従業員の他のシフトと時間重複がないかチェック
    if (fromShift) {
      const { data: toOtherShifts, error: toOtherShiftsError } = await supabase
        .from('shifts')
        .select('*, businesses(business_name, start_time, end_time)')
        .eq('employee_id', to.employeeId)
        .eq('date', from.date)
        .neq('id', toShift?.id || '');

      if (toOtherShiftsError) {
        console.error('Error fetching to other shifts:', toOtherShiftsError);
        return { valid: false, error: '既存シフトの取得に失敗しました' };
      }

      // fromのシフトの時間を取得
      const { data: fromBusiness, error: fromBusinessError } = await supabase
        .from('businesses')
        .select('start_time, end_time')
        .eq('id', from.businessId)
        .single();

      if (fromBusinessError || !fromBusiness) {
        console.error('Error fetching from business:', fromBusinessError);
        return { valid: false, error: '業務情報の取得に失敗しました' };
      }

      // 時間重複チェック
      for (const shift of toOtherShifts || []) {
        const business = shift.businesses;
        if (business && isTimeOverlap(fromBusiness.start_time, fromBusiness.end_time, business.start_time, business.end_time)) {
          return { valid: false, error: `${to.employeeName}さんは既に${business.business_name}（${business.start_time} - ${business.end_time}）にアサインされています` };
        }
      }
    }

    // toのシフトがある場合、fromの従業員の他のシフトと時間重複がないかチェック
    if (toShift) {
      const { data: fromOtherShifts, error: fromOtherShiftsError } = await supabase
        .from('shifts')
        .select('*, businesses(business_name, start_time, end_time)')
        .eq('employee_id', from.employeeId)
        .eq('date', to.date)
        .neq('id', fromShift?.id || '');

      if (fromOtherShiftsError) {
        console.error('Error fetching from other shifts:', fromOtherShiftsError);
        return { valid: false, error: '既存シフトの取得に失敗しました' };
      }

      // toのシフトの時間を取得
      const { data: toBusiness, error: toBusinessError } = await supabase
        .from('businesses')
        .select('start_time, end_time')
        .eq('id', to.businessId)
        .single();

      if (toBusinessError || !toBusiness) {
        console.error('Error fetching to business:', toBusinessError);
        return { valid: false, error: '業務情報の取得に失敗しました' };
      }

      // 時間重複チェック
      for (const shift of fromOtherShifts || []) {
        const business = shift.businesses;
        if (business && isTimeOverlap(toBusiness.start_time, toBusiness.end_time, business.start_time, business.end_time)) {
          return { valid: false, error: `${from.employeeName}さんは既に${business.business_name}（${business.start_time} - ${business.end_time}）にアサインされています` };
        }
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('Error in validateTimeOverlap:', error);
    return { valid: false, error: '時間重複チェック中にエラーが発生しました' };
  }
}

// 時間重複判定
function isTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  // HH:MM形式の時間を分に変換
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const start1Minutes = toMinutes(start1);
  const end1Minutes = toMinutes(end1);
  const start2Minutes = toMinutes(start2);
  const end2Minutes = toMinutes(end2);

  // 終了時刻が開始時刻より小さい場合は翌日扱い（24時間を加算）
  const adjustedEnd1 = end1Minutes < start1Minutes ? end1Minutes + 24 * 60 : end1Minutes;
  const adjustedEnd2 = end2Minutes < start2Minutes ? end2Minutes + 24 * 60 : end2Minutes;

  // 重複判定
  return start1Minutes < adjustedEnd2 && adjustedEnd1 > start2Minutes;
}
