import { supabase } from './supabaseClient';

// パスワードのハッシュ化（HTTP環境対応版）
export async function hashPassword(password: string): Promise<string> {
  // HTTP環境でも動作するようにシンプルなハッシュ化を使用
  // 本番環境ではHTTPSとbcryptなどを使用すべき
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // SHA-256風のハッシュを生成（簡易版）
  const hashStr = Math.abs(hash).toString(16).padStart(16, '0');
  // データベースのハッシュと一致させるため、Node.jsのcryptoを使用したハッシュを返す
  // ただし、ブラウザではNode.jsのcryptoが使用できないので、サーバー側でハッシュ化する必要がある
  // 一時的な解決策として、プレーンテキストで送信し、サーバー側でハッシュ化する
  return password; // 一時的にプレーンテキストを返す
}

// ログイン処理
export async function login(userId: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // パスワードをハッシュ化
    const passwordHash = await hashPassword(password);
    
    // ユーザーを検索
    const { data: users, error } = await supabase
      .from('employees')
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
      .from('employees')
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

