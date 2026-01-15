import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SwapOperation } from '../types/shift';

export const useShiftData = () => {
  const [isSwapping, setIsSwapping] = useState(false);

  // シフトを入れ替える
  const swapShifts = useCallback(async (operation: SwapOperation): Promise<boolean> => {
    setIsSwapping(true);
    try {
      const { from, to } = operation;

      // トランザクション的に処理
      // 1. fromのシフトを取得
      const { data: fromShift, error: fromError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', from.employeeId)
        .eq('business_id', from.businessId)
        .eq('date', from.date)
        .maybeSingle();

      if (fromError) throw fromError;

      // 2. toのシフトを取得
      const { data: toShift, error: toError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', to.employeeId)
        .eq('business_id', to.businessId)
        .eq('date', to.date)
        .maybeSingle();

      if (toError) throw toError;

      // 3. 入れ替え処理
      if (fromShift && toShift) {
        // 両方にシフトがある場合：employee_idを入れ替え
        const { error: updateFromError } = await supabase
          .from('shifts')
          .update({ employee_id: toShift.employee_id })
          .eq('id', fromShift.id);

        if (updateFromError) throw updateFromError;

        const { error: updateToError } = await supabase
          .from('shifts')
          .update({ employee_id: fromShift.employee_id })
          .eq('id', toShift.id);

        if (updateToError) throw updateToError;
      } else if (fromShift && !toShift) {
        // fromにのみシフトがある場合：toの位置に移動
        const { error: updateError } = await supabase
          .from('shifts')
          .update({
            employee_id: to.employeeId,
            business_id: to.businessId,
            date: to.date,
          })
          .eq('id', fromShift.id);

        if (updateError) throw updateError;
      } else if (!fromShift && toShift) {
        // toにのみシフトがある場合：fromの位置に移動
        const { error: updateError } = await supabase
          .from('shifts')
          .update({
            employee_id: from.employeeId,
            business_id: from.businessId,
            date: from.date,
          })
          .eq('id', toShift.id);

        if (updateError) throw updateError;
      }
      // 両方nullの場合は何もしない

      return true;
    } catch (error) {
      console.error('シフト入れ替えエラー:', error);
      return false;
    } finally {
      setIsSwapping(false);
    }
  }, []);

  return {
    swapShifts,
    isSwapping,
  };
};
