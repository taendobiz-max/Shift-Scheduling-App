/**
 * 相性の悪い従業員ペア管理ユーティリティ
 */

import { supabase } from '@/lib/supabase';

export interface IncompatiblePair {
  id?: number;
  employee_id_1: string;
  employee_name_1: string;
  employee_id_2: string;
  employee_name_2: string;
  location: string;
  reason?: string;
  severity: 'high' | 'medium' | 'low';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export class IncompatiblePairsManager {
  /**
   * すべての相性ペアを取得
   */
  static async getAllPairs(): Promise<{ success: boolean; data?: IncompatiblePair[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('incompatible_employee_pairs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching incompatible pairs:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error in getAllPairs:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 拠点別の相性ペアを取得
   */
  static async getPairsByLocation(location: string): Promise<{ success: boolean; data?: IncompatiblePair[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('incompatible_employee_pairs')
        .select('*')
        .eq('location', location)
        .eq('is_active', true)
        .order('severity', { ascending: false });

      if (error) {
        console.error('Error fetching pairs by location:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error in getPairsByLocation:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 相性ペアを追加
   */
  static async addPair(pair: Omit<IncompatiblePair, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: IncompatiblePair; error?: string }> {
    try {
      // 従業員IDを昇順にソート（小さい方をemployee_id_1に）
      const [id1, id2] = [pair.employee_id_1, pair.employee_id_2].sort();
      const [name1, name2] = pair.employee_id_1 === id1 
        ? [pair.employee_name_1, pair.employee_name_2]
        : [pair.employee_name_2, pair.employee_name_1];

      const { data, error } = await supabase
        .from('incompatible_employee_pairs')
        .insert([{
          employee_id_1: id1,
          employee_name_1: name1,
          employee_id_2: id2,
          employee_name_2: name2,
          location: pair.location,
          reason: pair.reason,
          severity: pair.severity,
          is_active: pair.is_active
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding incompatible pair:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in addPair:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 相性ペアを更新
   */
  static async updatePair(id: number, updates: Partial<IncompatiblePair>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('incompatible_employee_pairs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating incompatible pair:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updatePair:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 相性ペアを削除
   */
  static async deletePair(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('incompatible_employee_pairs')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting incompatible pair:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deletePair:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 特定の従業員が含まれる相性ペアを取得
   */
  static async getPairsByEmployee(employeeId: string, location: string): Promise<{ success: boolean; data?: IncompatiblePair[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('incompatible_employee_pairs')
        .select('*')
        .eq('location', location)
        .eq('is_active', true)
        .or(`employee_id_1.eq.${employeeId},employee_id_2.eq.${employeeId}`);

      if (error) {
        console.error('Error fetching pairs by employee:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error in getPairsByEmployee:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 2人の従業員が相性の悪いペアかチェック
   */
  static async checkIncompatible(employeeId1: string, employeeId2: string, location: string): Promise<{ isIncompatible: boolean; pair?: IncompatiblePair }> {
    try {
      const [id1, id2] = [employeeId1, employeeId2].sort();

      const { data, error } = await supabase
        .from('incompatible_employee_pairs')
        .select('*')
        .eq('employee_id_1', id1)
        .eq('employee_id_2', id2)
        .eq('location', location)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking incompatibility:', error);
        return { isIncompatible: false };
      }

      return { isIncompatible: !!data, pair: data || undefined };
    } catch (error) {
      console.error('Error in checkIncompatible:', error);
      return { isIncompatible: false };
    }
  }
}
