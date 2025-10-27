import { supabase } from './supabaseClient';

// パスワードのハッシュ化（簡易版、本番環境ではbcryptなどを使用すべき）
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ログイン処理
export async function login(userId: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // パスワードをハッシュ化
    const passwordHash = await hashPassword(password);
    
    // ユーザーを検索
    const { data: users, error } = await supabase
      .from('app_9213e72257_employees')
      .select('*')
      .eq('user_id', userId)
      .eq('password_hash', passwordHash)
      .limit(1);
    
    if (error) {
      console.error('Login error:', error);
      return { success: false, error: 'ログインに失敗しました' };
    }
    
    if (!users || users.length === 0) {
      return { success: false, error: 'ユーザーIDまたはパスワードが正しくありません' };
    }
    
    const user = users[0];
    
    // 最終ログイン日時を更新
    await supabase
      .from('app_9213e72257_employees')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);
    
    // セッションに保存
    sessionStorage.setItem('currentUser', JSON.stringify({
      id: user.id,
      user_id: user.user_id,
      name: user.氏名 || user.name,
      is_admin: user.is_admin || false
    }));
    
    return { success: true, user };
  } catch (err) {
    console.error('Login exception:', err);
    return { success: false, error: 'ログイン処理中にエラーが発生しました' };
  }
}

// ログアウト処理
export function logout(): void {
  sessionStorage.removeItem('currentUser');
  window.location.href = '/login';
}

// 現在のユーザーを取得
export function getCurrentUser(): any | null {
  const userJson = sessionStorage.getItem('currentUser');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

// ログイン状態を確認
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

// 管理者かどうかを確認
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.is_admin === true;
}

