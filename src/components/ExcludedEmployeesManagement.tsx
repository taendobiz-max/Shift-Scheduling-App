/**
 * 除外従業員管理画面
 * 管理職・別業務メンバーの除外設定を管理
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  UserX, 
  Plus, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Home,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ExcludedEmployeesManager, ExcludedEmployee } from '@/utils/excludedEmployeesManager';
import { supabase } from '@/lib/supabase';

interface EmployeeOption {
  id: string;
  name: string;
}

export const ExcludedEmployeesManagement: React.FC = () => {
  const [excludedEmployees, setExcludedEmployees] = useState<ExcludedEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  
  // フォーム状態
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    location: '',
    reason: '管理職・別業務'
  });

  const locations = ['東京', '川越', '川口'];

  useEffect(() => {
    loadExcludedEmployees();
  }, []);

  const loadExcludedEmployees = async () => {
    setLoading(true);
    try {
      const data = await ExcludedEmployeesManager.getExcludedEmployees();
      setExcludedEmployees(data);
    } catch (error) {
      console.error('Error loading excluded employees:', error);
      toast.error('除外従業員の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeesByLocation = async (location: string) => {
    if (!location) {
      setEmployeeOptions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('employee_id, name')
        .eq('office', location)
        .order('employee_id');

      if (error) throw error;

      // 既に除外登録されている従業員をフィルタリング
      const excludedIds = excludedEmployees
        .filter(ex => ex.location === location)
        .map(ex => ex.employee_id);

      const options = (data || [])
        .filter(emp => !excludedIds.includes(emp.employee_id))
        .map(emp => ({
          id: emp.employee_id,
          name: emp.name
        }));

      setEmployeeOptions(options);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('従業員リストの読み込みに失敗しました');
    }
  };

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    setFormData(prev => ({ ...prev, location, employee_id: '', employee_name: '' }));
    loadEmployeesByLocation(location);
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employeeOptions.find(emp => emp.id === employeeId);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        employee_id: employee.id,
        employee_name: employee.name
      }));
    }
  };

  const handleAddExcludedEmployee = async () => {
    if (!formData.employee_id || !formData.location) {
      toast.error('従業員と拠点を選択してください');
      return;
    }

    setLoading(true);
    try {
      const result = await ExcludedEmployeesManager.addExcludedEmployee({
        employee_id: formData.employee_id,
        employee_name: formData.employee_name,
        location: formData.location,
        reason: formData.reason,
        is_active: true
      });

      if (result.success) {
        toast.success('除外従業員を追加しました');
        setShowAddDialog(false);
        setFormData({
          employee_id: '',
          employee_name: '',
          location: '',
          reason: '管理職・別業務'
        });
        setSelectedLocation('');
        setEmployeeOptions([]);
        await loadExcludedEmployees();
      } else {
        // エラーメッセージをわかりやすく表示
        if (result.error?.includes('duplicate') || result.error?.includes('unique')) {
          toast.error('この従業員は既に除外登録されています');
        } else {
          toast.error(`追加に失敗しました: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error adding excluded employee:', error);
      toast.error('除外従業員の追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    setLoading(true);
    try {
      const result = await ExcludedEmployeesManager.toggleExcludedEmployee(id, !currentActive);
      
      if (result.success) {
        toast.success(currentActive ? '除外を無効にしました' : '除外を有効にしました');
        await loadExcludedEmployees();
      } else {
        toast.error(`更新に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling excluded employee:', error);
      toast.error('除外設定の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`${name}さんを除外リストから削除しますか？`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await ExcludedEmployeesManager.deleteExcludedEmployee(id);
      
      if (result.success) {
        toast.success('除外従業員を削除しました');
        await loadExcludedEmployees();
      } else {
        toast.error(`削除に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting excluded employee:', error);
      toast.error('除外従業員の削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = filterLocation === 'all' 
    ? excludedEmployees 
    : excludedEmployees.filter(emp => emp.location === filterLocation);

  const activeCount = excludedEmployees.filter(emp => emp.is_active).length;
  const countByLocation = locations.reduce((acc, loc) => {
    acc[loc] = excludedEmployees.filter(emp => emp.location === loc && emp.is_active).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserX className="w-8 h-8" />
            除外従業員管理
          </h1>
          <p className="text-muted-foreground mt-2">
            シフト自動生成時に除外する管理職・別業務メンバーを管理します
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddDialog(true)} disabled={loading}>
            <Plus className="w-4 h-4 mr-2" />
            新規追加
          </Button>
          <Link to="/">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              ホーム
            </Button>
          </Link>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総除外従業員数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}名</div>
          </CardContent>
        </Card>
        {locations.map(location => (
          <Card key={location}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {location}拠点
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countByLocation[location] || 0}名</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={filterLocation === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterLocation('all')}
            >
              すべて
            </Button>
            {locations.map(location => (
              <Button
                key={location}
                variant={filterLocation === location ? 'default' : 'outline'}
                onClick={() => setFilterLocation(location)}
              >
                {location}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 除外従業員リスト */}
      <Card>
        <CardHeader>
          <CardTitle>除外従業員一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>読み込み中...</p>}
          {!loading && filteredEmployees.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                除外従業員が登録されていません
              </AlertDescription>
            </Alert>
          )}
          {!loading && filteredEmployees.length > 0 && (
            <div className="space-y-2">
              {filteredEmployees.map(employee => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{employee.employee_name}</span>
                      <Badge variant="outline">{employee.location}</Badge>
                      <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                        {employee.is_active ? '有効' : '無効'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      従業員ID: {employee.employee_id} | 理由: {employee.reason}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(employee.id!, employee.is_active)}
                      disabled={loading}
                    >
                      {employee.is_active ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(employee.id!, employee.employee_name)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 追加ダイアログ */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>除外従業員を追加</DialogTitle>
            <DialogDescription>
              シフト自動生成時に除外する従業員を選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">拠点</Label>
              <Select value={selectedLocation} onValueChange={handleLocationChange}>
                <SelectTrigger>
                  <SelectValue placeholder="拠点を選択" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(location => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employee">従業員</Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={handleEmployeeChange}
                disabled={!selectedLocation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="従業員を選択" />
                </SelectTrigger>
                <SelectContent>
                  {employeeOptions.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reason">除外理由</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="管理職・別業務"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAddExcludedEmployee} disabled={loading}>
              <CheckCircle className="w-4 h-4 mr-2" />
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
