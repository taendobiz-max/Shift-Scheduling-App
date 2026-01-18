import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Lock, Mail, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  office: string;
  role: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // パスワード変更フォーム
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // 現在のユーザー情報を取得
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('ユーザーが見つかりません');

      // usersテーブルからユーザー情報を取得
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (userError) throw userError;

      setProfile({
        id: user.id,
        email: user.email || '',
        name: userData.name || '',
        office: userData.office || '',
        role: userData.role || ''
      });
    } catch (error: any) {
      console.error('プロフィール読み込みエラー:', error);
      toast({
        title: 'エラー',
        description: 'プロフィール情報の読み込みに失敗しました',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('すべてのフィールドを入力してください');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('新しいパスワードは8文字以上である必要があります');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('新しいパスワードが一致しません');
      return;
    }

    try {
      setChangingPassword(true);

      // 現在のパスワードで再認証
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword
      });

      if (signInError) {
        setPasswordError('現在のパスワードが正しくありません');
        return;
      }

      // パスワードを更新
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast({
        title: '成功',
        description: 'パスワードを変更しました'
      });

      // フォームをリセット
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('パスワード変更エラー:', error);
      setPasswordError('パスワードの変更に失敗しました');
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理者';
      case 'manager':
        return '営業所長';
      case 'user':
        return '一般ユーザー';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            プロフィール情報を読み込めませんでした
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">マイページ</h1>

      <div className="grid gap-6">
        {/* プロフィール情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              プロフィール情報
            </CardTitle>
            <CardDescription>
              あなたのアカウント情報
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                氏名
              </Label>
              <Input
                id="name"
                value={profile.name}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="office" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                営業所
              </Label>
              <Input
                id="office"
                value={profile.office}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">権限</Label>
              <Input
                id="role"
                value={getRoleLabel(profile.role)}
                disabled
                className="bg-gray-50"
              />
            </div>

            <Alert>
              <AlertDescription>
                プロフィール情報の変更は管理者に依頼してください
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* パスワード変更 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              パスワード変更
            </CardTitle>
            <CardDescription>
              セキュリティのため、定期的にパスワードを変更してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="currentPassword">現在のパスワード</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="現在のパスワードを入力"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="newPassword">新しいパスワード</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="新しいパスワードを入力（8文字以上）"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="新しいパスワードを再入力"
                />
              </div>

              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={changingPassword}
                className="w-full"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    変更中...
                  </>
                ) : (
                  'パスワードを変更'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
