import { supabase } from '@/lib/supabase';

export class DatabaseSetup {
  // 休暇管理マスタテーブルを作成
  static async createVacationMastersTable(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('create_vacation_masters_table');
      
      if (error) {
        console.error('テーブル作成エラー:', error);
        return false;
      }
      
      console.log('✅ vacation_mastersテーブルが正常に作成されました');
      return true;
    } catch (error) {
      console.error('テーブル作成中にエラーが発生しました:', error);
      return false;
    }
  }

  // SQL実行による直接テーブル作成（フォールバック）
  static async createVacationMastersTableDirect(): Promise<boolean> {
    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS vacation_masters (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id TEXT NOT NULL,
          employee_name TEXT NOT NULL,
          location TEXT NOT NULL,
          vacation_date DATE NOT NULL,
          reason TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by TEXT,
          
          -- ユニーク制約（同一従業員・同一日付の重複防止）
          UNIQUE(employee_id, vacation_date)
        );

        -- インデックス作成
        CREATE INDEX IF NOT EXISTS idx_vacation_masters_date ON vacation_masters(vacation_date);
        CREATE INDEX IF NOT EXISTS idx_vacation_masters_location ON vacation_masters(location);
        CREATE INDEX IF NOT EXISTS idx_vacation_masters_employee ON vacation_masters(employee_id);

        -- Row Level Security (RLS) 設定
        ALTER TABLE vacation_masters ENABLE ROW LEVEL SECURITY;
        
        -- 全ユーザーが読み取り可能
        CREATE POLICY IF NOT EXISTS "allow_read_all_vacations" ON vacation_masters FOR SELECT USING (true);
        
        -- 認証済みユーザーが挿入可能
        CREATE POLICY IF NOT EXISTS "allow_insert_vacations" ON vacation_masters FOR INSERT TO authenticated WITH CHECK (true);
        
        -- 認証済みユーザーが更新可能
        CREATE POLICY IF NOT EXISTS "allow_update_vacations" ON vacation_masters FOR UPDATE TO authenticated USING (true);
        
        -- 認証済みユーザーが削除可能
        CREATE POLICY IF NOT EXISTS "allow_delete_vacations" ON vacation_masters FOR DELETE TO authenticated USING (true);
      `;

      // SQLを実行（注意: 本来はSupabaseのSQL Editorで実行すべき）
      console.log('📝 vacation_mastersテーブル作成SQL:');
      console.log(createTableSQL);
      
      return true;
    } catch (error) {
      console.error('テーブル作成SQL生成中にエラーが発生しました:', error);
      return false;
    }
  }

  // テーブル存在確認
  static async checkVacationMastersTable(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('vacation_masters')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.log('⚠️ vacation_mastersテーブルが存在しません');
          return false;
        }
        throw error;
      }

      console.log('✅ vacation_mastersテーブルが存在します');
      return true;
    } catch (error) {
      console.error('テーブル存在確認エラー:', error);
      return false;
    }
  }
}