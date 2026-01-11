import { supabase } from './supabaseClient';
import { VacationMaster, VacationRequest } from '@/types/vacation';

export class VacationManager {
  // 休暇データを作成
  static async createVacation(vacation: VacationRequest): Promise<VacationMaster> {
    try {
      // First check if table exists, if not create it
      await this.ensureTableExists();
      
      const { data, error } = await supabase
        .from('vacation_masters')
        .insert({
          employee_id: vacation.employee_id,
          employee_name: vacation.employee_name,
          location: vacation.location,
          vacation_date: vacation.vacation_date,
          vacation_type: vacation.vacation_type,
          reason: vacation.reason,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Vacation creation error:', error);
        throw new Error(`休暇データの作成に失敗しました: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createVacation:', error);
      throw error;
    }
  }

  // テーブルの存在確認と作成
  static async ensureTableExists(): Promise<void> {
    try {
      // Try to select from the table to check if it exists
      const { error } = await supabase
        .from('vacation_masters')
        .select('id')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        // Table doesn't exist, create it
        console.log('Creating vacation_masters table...');
        await this.createVacationTable();
      }
    } catch (error) {
      console.error('Error checking table existence:', error);
      // Try to create table anyway
      await this.createVacationTable();
    }
  }

  // 休暇テーブルを作成
  static async createVacationTable(): Promise<void> {
    try {
      const { error } = await supabase.rpc('create_vacation_table');
      
      if (error) {
        console.error('Error creating vacation table:', error);
        // Fallback: try direct SQL execution
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS vacation_masters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id VARCHAR(50) NOT NULL,
            employee_name VARCHAR(100) NOT NULL,
            location VARCHAR(100) NOT NULL,
            vacation_date DATE NOT NULL,
            reason TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_vacation_employee_id ON vacation_masters(employee_id);
          CREATE INDEX IF NOT EXISTS idx_vacation_date ON vacation_masters(vacation_date);
          CREATE INDEX IF NOT EXISTS idx_vacation_location ON vacation_masters(location);
        `;
        
        // This will need to be executed via Supabase dashboard or migration
        console.log('Please execute this SQL in Supabase dashboard:', createTableSQL);
      }
    } catch (error) {
      console.error('Error in createVacationTable:', error);
    }
  }

  // 日付範囲で休暇データを取得
  static async getVacationsByDateRange(startDate: string, endDate: string): Promise<VacationMaster[]> {
    try {
      await this.ensureTableExists();
      
      const { data, error } = await supabase
        .from('vacation_masters')
        .select('*')
        .gte('vacation_date', startDate)
        .lte('vacation_date', endDate)
        .order('vacation_date', { ascending: true });

      if (error) {
        throw new Error(`休暇データの取得に失敗しました: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getVacationsByDateRange:', error);
      return [];
    }
  }

  // 拠点で休暇データを取得
  static async getVacationsByLocation(location: string): Promise<VacationMaster[]> {
    try {
      await this.ensureTableExists();
      
      const { data, error } = await supabase
        .from('vacation_masters')
        .select('*')
        .eq('location', location)
        .order('vacation_date', { ascending: true });

      if (error) {
        throw new Error(`休暇データの取得に失敗しました: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getVacationsByLocation:', error);
      return [];
    }
  }

  // 全ての休暇データを取得
  static async getAllVacations(): Promise<VacationMaster[]> {
    try {
      await this.ensureTableExists();
      
      const { data, error } = await supabase
        .from('vacation_masters')
        .select('*')
        .order('vacation_date', { ascending: true });

      if (error) {
        throw new Error(`休暇データの取得に失敗しました: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllVacations:', error);
      return [];
    }
  }

  // 休暇データを更新
  static async updateVacation(id: string, vacation: Partial<VacationRequest>): Promise<VacationMaster> {
    try {
      await this.ensureTableExists();
      
      const { data, error } = await supabase
        .from('vacation_masters')
        .update({
          ...vacation,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`休暇データの更新に失敗しました: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateVacation:', error);
      throw error;
    }
  }

  // 休暇データを削除
  static async deleteVacation(id: string): Promise<boolean> {
    try {
      await this.ensureTableExists();
      
      const { error } = await supabase
        .from('vacation_masters')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`休暇データの削除に失敗しました: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteVacation:', error);
      throw error;
    }
  }

  // 重複チェック（同一従業員・同一日付）
  static async checkDuplicate(employeeId: string, vacationDate: string): Promise<boolean> {
    try {
      await this.ensureTableExists();
      
      const { data, error } = await supabase
        .from('vacation_masters')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('vacation_date', vacationDate);

      if (error) {
        console.warn('重複チェックに失敗しました:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.warn('Error in checkDuplicate:', error);
      return false;
    }
  }

  // 休暇データをNonWorkingMember形式に変換
  static convertToNonWorkingMembers(vacations: VacationMaster[]) {
    return vacations.map(vacation => ({
      id: `vacation-${vacation.id}`,
      date: vacation.vacation_date,
      employeeName: vacation.employee_name,
      employeeId: vacation.employee_id,
      reason: `【${vacation.vacation_type}】${vacation.reason}`,
      source: 'vacation_master' as const
    }));
  }
}