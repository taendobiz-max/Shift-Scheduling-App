import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface SwapResult {
  success: boolean;
  error?: string;
}

export const useShiftData = () => {
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  // データを取得する関数
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // シフトデータを取得
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select(`
          *,
          employees(id, name),
          businesses(id, business_name, start_time, end_time)
        `)
        .order('date', { ascending: true });

      if (shiftsError) {
        throw new Error(`シフトデータの取得に失敗しました: ${shiftsError.message}`);
      }

      // 従業員データを取得
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (employeesError) {
        throw new Error(`従業員データの取得に失敗しました: ${employeesError.message}`);
      }

      // シフトデータを整形
      const formattedShifts = (shiftsData || []).map(shift => ({
        ...shift,
        employee_id: shift.employee_id,
        employee_name: shift.employees?.name || '',
        business_id: shift.business_id,
        business_name: shift.businesses?.business_name || '',
        start_time: shift.businesses?.start_time || '',
        end_time: shift.businesses?.end_time || '',
      }));

      setShifts(formattedShifts);
      setEmployees(employeesData || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // シフトを入れ替える関数
  const swapShifts = useCallback(async (from: any, to: any): Promise<SwapResult> => {
    setIsSwapping(true);
    try {
      console.log('🔄 [SWAP] Starting swap operation:', { from, to });

      // fromとtoのシフトを取得
      const fromShift = shifts.find(s => s.id === from.id);
      const toShift = shifts.find(s => s.id === to.id);

      // 空セルの場合の処理
      if (from.isEmpty && to.isEmpty) {
        return { success: false, error: '両方とも空セルです' };
      }

      if (from.isEmpty) {
        // fromが空セル、toがシフト：toのシフトをfromの従業員に割り当て
        if (!toShift) {
          return { success: false, error: 'シフトが見つかりません' };
        }

        const { error: updateError } = await supabase
          .from('shifts')
          .update({ employee_id: from.employee_id })
          .eq('id', toShift.id);

        if (updateError) {
          console.error('❌ [SWAP] Error updating shift:', updateError);
          return { success: false, error: `シフトの更新に失敗しました: ${updateError.message}` };
        }
      } else if (to.isEmpty) {
        // toが空セル、fromがシフト：fromのシフトをtoの従業員に割り当て
        if (!fromShift) {
          return { success: false, error: 'シフトが見つかりません' };
        }

        const { error: updateError } = await supabase
          .from('shifts')
          .update({ employee_id: to.employee_id })
          .eq('id', fromShift.id);

        if (updateError) {
          console.error('❌ [SWAP] Error updating shift:', updateError);
          return { success: false, error: `シフトの更新に失敗しました: ${updateError.message}` };
        }
      } else {
        // 両方ともシフト：employee_idを入れ替え
        if (!fromShift || !toShift) {
          return { success: false, error: 'シフトが見つかりません' };
        }

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
  }, [shifts]);

  // データを再取得する関数
  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    shifts,
    employees,
    loading,
    error,
    swapShifts,
    refreshData,
    isSwapping,
  };
};
