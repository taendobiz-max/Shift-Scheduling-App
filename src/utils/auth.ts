import { supabase } from './supabaseClient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: number;
  office?: string;
}

// ログイン処理
export async function login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Supabase Authenticationでログイン
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Login error:', authError);
      return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
    }

    if (!authData.user) {
      return { success: false, error: 'ログインに失敗しました' };
    }

    // public.usersテーブルからユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      console.error('User data error:', userError);
      return { success: false, error: 'ユーザー情報の取得に失敗しました' };
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      office: userData.office
    };

    // セッションに保存
    sessionStorage.setItem('currentUser', JSON.stringify(user));

    return { success: true, user };
  } catch (err) {
    console.error('Login exception:', err);
    return { success: false, error: 'ログイン処理中にエラーが発生しました' };
  }
}

// ログアウト処理
export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Logout error:', err);
  }
  sessionStorage.removeItem('currentUser');
  window.location.href = '/login';
}

// 現在のユーザーを取得
export function getCurrentUser(): User | null {
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
  return user?.role === 3;
}

// 営業所長以上かどうかを確認
export function isManager(): boolean {
  const user = getCurrentUser();
  return user?.role !== undefined && user.role >= 2;
}

// 権限レベルを取得
export function getUserRole(): number {
  const user = getCurrentUser();
  return user?.role || 1;
}

// 権限チェック
export function hasPermission(requiredRole: number): boolean {
  const userRole = getUserRole();
  return userRole >= requiredRole;
}

// パスワード変更
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: 'ログインしていません' };
    }

    // 現在のパスワードで再認証
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInError) {
      return { success: false, error: '現在のパスワードが正しくありません' };
    }

    // パスワードを更新
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return { success: false, error: 'パスワードの変更に失敗しました' };
    }

    return { success: true };
  } catch (err) {
    console.error('Change password exception:', err);
    return { success: false, error: 'パスワード変更中にエラーが発生しました' };
  }
}
