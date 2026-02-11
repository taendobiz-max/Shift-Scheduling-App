import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function UserRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: '2',
    office: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Supabase Authでユーザーを作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('ユーザーの作成に失敗しました');
      }

      // usersテーブルにユーザー情報を登録
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          role: parseInt(formData.role),
          office: formData.office || null,
        });

      if (dbError) throw dbError;

      toast.success('ユーザーを登録しました');
      navigate('/');

      // フォームをリセット
      setFormData({
        email: '',
        password: '',
        name: '',
        role: '2',
        office: '',
      });
    } catch (error: any) {
      console.error('ユーザー登録エラー:', error);
      toast.error(error.message || 'ユーザー登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  ホーム
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">ログインユーザー追加</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="h-6 w-6 mr-2" />
              ユーザー情報入力
            </CardTitle>
            <CardDescription>
              新しいログインユーザーを登録します。メールアドレスとパスワードは必須です。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@fkk-g.co.jp"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">パスワード *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="6文字以上"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">ユーザー名 *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="山田 太郎"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">権限レベル</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="権限レベルを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - 一般ユーザー</SelectItem>
                    <SelectItem value="2">2 - 営業所長</SelectItem>
                    <SelectItem value="3">3 - 管理者</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="office">営業所</Label>
                <Input
                  id="office"
                  type="text"
                  placeholder="東京"
                  value={formData.office}
                  onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => navigate('/')}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      ユーザーを登録
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">注意事項</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• メールアドレスは一意である必要があります（重複不可）</li>
                <li>• パスワードは6文字以上で設定してください</li>
                <li>• 電話番号も一意である必要があります（重複不可）</li>
                <li>• ユーザーIDは自動生成されます</li>
                <li>• 登録後、ユーザーは即座にログイン可能になります</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
