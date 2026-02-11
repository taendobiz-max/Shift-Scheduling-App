import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk2MzczMSwiZXhwIjoyMDcyNTM5NzMxfQ.gX7wLvAfd2LwDmMwLHmDlAqsrdloDGc7jhvJzDf0zoM';

// 管理者用のSupabaseクライアント（サービスロールキーを使用）
// 注意: このクライアントはサーバーサイドまたは管理者機能でのみ使用すること
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabaseAdmin;
