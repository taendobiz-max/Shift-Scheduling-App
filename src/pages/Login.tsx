import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, AlertCircle } from 'lucide-react';
import { login } from '@/utils/auth';

export default function Login() {
  const navigate = useNavigate();
  const [userIdOrEmail, setUserIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // @が含まれていない場合は、自動的にドメインを追加
      const email = userIdOrEmail.includes('@') 
        ? userIdOrEmail 
        : `${userIdOrEmail}@fkk-g.co.jp`;
      
      const result = await login(email, password);
      
      if (result.success) {
        // ログイン成功、ホームページにリダイレクト
        navigate('/');
      } else {
        setError(result.error || 'ログインに失敗しました');
      }
    } catch (err) {
      setError('ログイン処理中にエラーが発生しました');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <LogIn className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-center">シフト管理システム</CardTitle>
          <CardDescription className="text-center">
            ユーザーIDとパスワードを入力してログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="userIdOrEmail">ユーザーID</Label>
              <Input
                id="userIdOrEmail"
                type="text"
                placeholder="ユーザーIDを入力"
                value={userIdOrEmail}
                onChange={(e) => setUserIdOrEmail(e.target.value)}
                required
                autoFocus
              />

            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
            
            <p className="text-xs text-center text-gray-500 mt-4">
              ユーザIDやパスワードが分からない方は<a href="mailto:t-endo@fkk-g.co.jp" className="text-blue-600 hover:underline">t-endo@fkk-g.co.jp</a>へご連絡ください
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
