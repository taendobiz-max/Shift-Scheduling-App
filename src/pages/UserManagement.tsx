import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { getCurrentUser, isAdmin } from '@/utils/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: number;
  office?: string;
  created_at: string;
}

const API_BASE_URL = '/api';

export default function UserManagement() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // フォーム状態
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 1,
    office: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('ユーザー一覧の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      if (!formData.email || !formData.name || !formData.password) {
        toast.error('メールアドレス、名前、パスワードは必須です');
        return;
      }

      // バックエンドAPIでユーザーを作成
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          role: formData.role,
          office: formData.office
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ユーザーの作成に失敗しました');
      }

      toast.success('ユーザーを追加しました');
      setIsDialogOpen(false);
      resetForm();
      await loadUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(`ユーザーの追加に失敗しました: ${error.message}`);
    }
  };

  const handleEditUser = async () => {
    try {
      if (!editingUser) return;

      // バックエンドAPIでユーザーを更新
      const updateData: any = {
        name: formData.name,
        role: formData.role,
        office: formData.office
      };

      // パスワードが入力されている場合のみ追加
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password;
      }

      const response = await fetch(`${API_BASE_URL}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ユーザー情報の更新に失敗しました');
      }

      toast.success('ユーザー情報を更新しました');
      setIsDialogOpen(false);
      setEditingUser(null);
      resetForm();
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`ユーザー情報の更新に失敗しました: ${error.message}`);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!isAdmin()) {
      toast.error('管理者のみがユーザーを削除できます');
      return;
    }

    if (user.id === currentUser?.id) {
      toast.error('自分自身を削除することはできません');
      return;
    }

    if (!window.confirm(`${user.name}（${user.email}）を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      // バックエンドAPIでユーザーを削除
      const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ユーザーの削除に失敗しました');
      }

      toast.success('ユーザーを削除しました');
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`ユーザーの削除に失敗しました: ${error.message}`);
    }
  };

  const openAddDialog = () => {
    resetForm();
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
      office: user.office || ''
    });
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 1,
      office: ''
    });
  };

  const getRoleName = (role: number) => {
    switch (role) {
      case 1: return '一般ユーザー';
      case 2: return '営業所長';
      case 3: return '管理者';
      default: return '不明';
    }
  };

  const getRoleBadgeColor = (role: number) => {
    switch (role) {
      case 1: return 'bg-gray-100 text-gray-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          ホームに戻る
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              <CardTitle>ユーザー管理</CardTitle>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  ユーザー追加
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'ユーザー編集' : 'ユーザー追加'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!!editingUser}
                      placeholder="user@fkk-g.co.jp"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">名前</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="山田太郎"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      パスワード {editingUser && '（変更する場合のみ入力）'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? '変更しない場合は空欄' : 'パスワード'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">権限レベル</Label>
                    <Select
                      value={formData.role.toString()}
                      onValueChange={(value) => setFormData({ ...formData, role: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">一般ユーザー</SelectItem>
                        <SelectItem value="2">営業所長</SelectItem>
                        <SelectItem value="3">管理者</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="office">営業所</Label>
                    <Input
                      id="office"
                      value={formData.office}
                      onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                      placeholder="本社"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={editingUser ? handleEditUser : handleAddUser}
                      className="flex-1"
                    >
                      {editingUser ? '更新' : '追加'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingUser(null);
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>権限</TableHead>
                  <TableHead>営業所</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {getRoleName(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>{user.office || '-'}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString('ja-JP')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin() && user.id !== currentUser?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
