import { supabase } from '@/lib/supabase';

export interface ShiftCopyOptions {
  sourceStartDate: string;
  sourceEndDate: string;
  targetStartDate: string;
  location?: string;
}

export interface ShiftData {
  id: string;
  date: string;
  employee_id: string;
  business_master_id: string;
  start_time?: string;
  end_time?: string;
  location?: string;
}

/**
 * 指定期間のシフトをコピーする
 * @param options コピーオプション
 * @returns コピーされたシフト数
 */
export async function copyShifts(options: ShiftCopyOptions): Promise<number> {
  const { sourceStartDate, sourceEndDate, targetStartDate, location } = options;

  try {
    // 1. コピー元のシフトを取得
    let query = supabase
      .from('shifts')
      .select('*')
      .gte('date', sourceStartDate)
      .lte('date', sourceEndDate);

    if (location && location !== 'all') {
      query = query.eq('location', location);
    }

    const { data: sourceShifts, error: fetchError } = await query;

    if (fetchError) {
      console.error('シフト取得エラー:', fetchError);
      throw new Error('コピー元のシフトの取得に失敗しました');
    }

    if (!sourceShifts || sourceShifts.length === 0) {
      throw new Error('コピー元のシフトが見つかりません');
    }

    // 2. 日付の差分を計算
    const sourceStart = new Date(sourceStartDate);
    const targetStart = new Date(targetStartDate);
    const daysDiff = Math.floor((targetStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));

    // 3. 新しいシフトデータを作成
    const newShifts = sourceShifts.map(shift => {
      const originalDate = new Date(shift.date);
      const newDate = new Date(originalDate);
      newDate.setDate(newDate.getDate() + daysDiff);

      return {
        date: newDate.toISOString().split('T')[0],
        employee_id: shift.employee_id,
        business_master_id: shift.business_master_id,
        start_time: shift.start_time,
        end_time: shift.end_time,
        location: shift.location,
        created_at: new Date().toISOString()
      };
    });

    // 4. コピー先の期間の既存シフトを削除（オプション）
    const targetEndDate = new Date(targetStart);
    targetEndDate.setDate(targetEndDate.getDate() + (new Date(sourceEndDate).getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));

    let deleteQuery = supabase
      .from('shifts')
      .delete()
      .gte('date', targetStartDate)
      .lte('date', targetEndDate.toISOString().split('T')[0]);

    if (location && location !== 'all') {
      deleteQuery = deleteQuery.eq('location', location);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('既存シフト削除エラー:', deleteError);
      // 削除エラーは無視して続行
    }

    // 5. 新しいシフトを挿入
    const { error: insertError } = await supabase
      .from('shifts')
      .insert(newShifts);

    if (insertError) {
      console.error('シフト挿入エラー:', insertError);
      throw new Error('シフトのコピーに失敗しました');
    }

    return newShifts.length;
  } catch (error) {
    console.error('シフトコピーエラー:', error);
    throw error;
  }
}

/**
 * 前週のシフトをコピーする
 * @param targetDate コピー先の日付（週の開始日）
 * @param location 拠点（オプション）
 * @returns コピーされたシフト数
 */
export async function copyPreviousWeek(targetDate: string, location?: string): Promise<number> {
  const target = new Date(targetDate);
  const sourceStart = new Date(target);
  sourceStart.setDate(sourceStart.getDate() - 7);
  
  const sourceEnd = new Date(sourceStart);
  sourceEnd.setDate(sourceEnd.getDate() + 6);

  return copyShifts({
    sourceStartDate: sourceStart.toISOString().split('T')[0],
    sourceEndDate: sourceEnd.toISOString().split('T')[0],
    targetStartDate: targetDate,
    location
  });
}

/**
 * 前月のシフトをコピーする
 * @param targetDate コピー先の日付（月の開始日）
 * @param location 拠点（オプション）
 * @returns コピーされたシフト数
 */
export async function copyPreviousMonth(targetDate: string, location?: string): Promise<number> {
  const target = new Date(targetDate);
  const sourceStart = new Date(target);
  sourceStart.setMonth(sourceStart.getMonth() - 1);
  
  const sourceEnd = new Date(sourceStart);
  sourceEnd.setMonth(sourceEnd.getMonth() + 1);
  sourceEnd.setDate(0); // 前月の最終日

  return copyShifts({
    sourceStartDate: sourceStart.toISOString().split('T')[0],
    sourceEndDate: sourceEnd.toISOString().split('T')[0],
    targetStartDate: targetDate,
    location
  });
}
