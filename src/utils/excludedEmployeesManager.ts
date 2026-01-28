/**
 * 除外従業員管理ユーティリティ
 * シフト自動生成時に除外する管理職・別業務メンバーを管理
 */

import { supabase } from '@/lib/supabase';

export interface ExcludedEmployee {
  id?: number;
  employee_id: string;
  employee_name: string;
  location: string;
  reason: string;
  is_active: boolean;
  can_handle_roll_call: boolean;
  created_at?: string;
  updated_at?: string;
}

export class ExcludedEmployeesManager {
  /**
   * 除外従業員リストを取得
   * @param location 拠点名（指定しない場合は全拠点）
   * @param activeOnly 有効な除外のみ取得（デフォルト: true）
   */
  static async getExcludedEmployees(
    location?: string,
    activeOnly: boolean = true
  ): Promise<ExcludedEmployee[]> {
    try {
      let query = supabase
        .from('excluded_employees')
        .select('*')
        .order('location')
        .order('employee_id');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      if (location) {
        query = query.eq('location', location);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching excluded employees:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception in getExcludedEmployees:', error);
      return [];
    }
  }

  /**
   * 除外従業員IDのリストを取得
   * @param location 拠点名
   */
  static async getExcludedEmployeeIds(location: string): Promise<string[]> {
    const excluded = await this.getExcludedEmployees(location, true);
    return excluded.map(emp => emp.employee_id);
  }

  /**
   * 通常業務で除外する従業員IDのリストを取得
   * 点呼対応可能な従業員は除外しない
   * @param location 拠点名
   */
  static async getExcludedEmployeeIdsForRegularShifts(location: string): Promise<string[]> {
    const excluded = await this.getExcludedEmployees(location, true);
    // 点呼対応可能な従業員は除外しない
    return excluded
      .filter(emp => !emp.can_handle_roll_call)
      .map(emp => emp.employee_id);
  }

  /**
   * 点呼対応可能な除外従業員を取得
   * @param location 拠点名
   */
  static async getRollCallCapableExcludedEmployees(location: string): Promise<ExcludedEmployee[]> {
    const excluded = await this.getExcludedEmployees(location, true);
    return excluded.filter(emp => emp.can_handle_roll_call);
  }

  /**
   * 従業員が除外対象かどうかをチェック
   * @param employeeId 従業員ID
   * @param location 拠点名
   */
  static async isEmployeeExcluded(
    employeeId: string,
    location: string
  ): Promise<boolean> {
    const excludedIds = await this.getExcludedEmployeeIds(location);
    return excludedIds.includes(employeeId);
  }

  /**
   * 除外従業員を追加
   */
  static async addExcludedEmployee(
    employee: Omit<ExcludedEmployee, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('excluded_employees')
        .insert({
          employee_id: employee.employee_id,
          employee_name: employee.employee_name,
          location: employee.location,
          reason: employee.reason || '管理職・別業務',
          is_active: employee.is_active !== undefined ? employee.is_active : true,
          can_handle_roll_call: employee.can_handle_roll_call || false
        });

      if (error) {
        console.error('❌ Error adding excluded employee:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Exception in addExcludedEmployee:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 除外従業員を更新
   */
  static async updateExcludedEmployee(
    id: number,
    updates: Partial<Omit<ExcludedEmployee, 'id' | 'created_at'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('excluded_employees')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error updating excluded employee:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Exception in updateExcludedEmployee:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 除外従業員を削除
   */
  static async deleteExcludedEmployee(
    id: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('excluded_employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting excluded employee:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Exception in deleteExcludedEmployee:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 除外従業員の有効/無効を切り替え
   */
  static async toggleExcludedEmployee(
    id: number,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateExcludedEmployee(id, { is_active: isActive });
  }

  /**
   * 従業員リストから除外対象を除外
   * @param employees 従業員リスト
   * @param location 拠点名
   */
  static async filterExcludedEmployees<T extends { 従業員ID?: string; id?: string }>(
    employees: T[],
    location: string
  ): Promise<T[]> {
    const excludedIds = await this.getExcludedEmployeeIds(location);
    
    return employees.filter(emp => {
      const empId = emp.従業員ID || emp.id;
      return empId && !excludedIds.includes(empId);
    });
  }

  /**
   * 拠点ごとの除外従業員数を取得
   */
  static async getExcludedCountByLocation(): Promise<Record<string, number>> {
    const allExcluded = await this.getExcludedEmployees(undefined, true);
    
    return allExcluded.reduce((acc, emp) => {
      acc[emp.location] = (acc[emp.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
