/**
 * 相性の悪い従業員ペア管理画面
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
  Users, 
  Plus, 
  Trash2, 
  Home,
  AlertTriangle,
  UserX
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { IncompatiblePairsManager, IncompatiblePair } from '@/utils/incompatiblePairsManager';
import { supabase } from '@/lib/supabase';

interface Employee {
  employee_id: string;
  name: string;
  office: string;
}

export function IncompatiblePairsManagement() {
  const [pairs, setPairs] = useState<IncompatiblePair[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterLocation, setFilterLocation] = useState<string>('all');
  
  // フォームデータ
  const [formData, setFormData] = useState({
    location: '',
    employee1: '',
    employee2: '',
    reason: '',
    severity: 'high' as 'high' | 'medium' | 'low'
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);

  const locations = ['東京', '川越', '川口'];
  const severityLabels = {
    high: '高',
    medium: '中',
    low: '低'
  };
  const severityColors = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary'
  } as const;

  useEffect(() => {
    loadPairs();
  }, []);

  useEffect(() => {
    if (formData.location) {
      loadEmployees(formData.location);
    }
  }, [formData.location]);

  useEffect(() => {
    // 従業員1が選択されたら、従業員2の選択肢から除外
    if (formData.employee1) {
      setAvailableEmployees(employees.filter(emp => emp.employee_id !== formData.employee1));
    } else {
      setAvailableEmployees(employees);
    }
  }, [formData.employee1, employees]);

  const loadPairs = async () => {
    setLoading(true);
    try {
      const result = await IncompatiblePairsManager.getAllPairs();
      
      if (result.success && result.data) {
        setPairs(result.data);
      } else {
        toast.error(`相性ペアの読み込みに失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Error loading pairs:', error);
      toast.error('相性ペアの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async (location: string) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('employee_id, name, office')
        .eq('office', location)
        .order('employee_id');

      if (error) {
        console.error('Error loading employees:', error);
        toast.error('従業員の読み込みに失敗しました');
        return;
      }

      setEmployees(data || []);
      setAvailableEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('従業員の読み込みに失敗しました');
    }
  };

  const handleAdd = async () => {
    if (!formData.location || !formData.employee1 || !formData.employee2) {
      toast.error('すべての必須項目を入力してください');
      return;
    }

    if (formData.employee1 === formData.employee2) {
      toast.error('同じ従業員を選択することはできません');
      return;
    }

    setLoading(true);
    try {
      const employee1 = employees.find(e => e.employee_id === formData.employee1);
      const employee2 = employees.find(e => e.employee_id === formData.employee2);

      if (!employee1 || !employee2) {
        toast.error('従業員情報が見つかりません');
        return;
      }

      const result = await IncompatiblePairsManager.addPair({
        employee_id_1: formData.employee1,
        employee_name_1: employee1.name,
        employee_id_2: formData.employee2,
        employee_name_2: employee2.name,
        location: formData.location,
        reason: formData.reason || '相性が悪い',
        severity: formData.severity,
        is_active: true
      });

      if (result.success) {
        toast.success('相性ペアを追加しました');
        setShowAddDialog(false);
        setFormData({
          location: '',
          employee1: '',
          employee2: '',
          reason: '',
          severity: 'high'
        });
        await loadPairs();
      } else {
        if (result.error?.includes('unique_pair')) {
          toast.error('このペアは既に登録されています');
        } else {
          toast.error(`追加に失敗しました: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error adding pair:', error);
      toast.error('相性ペアの追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name1: string, name2: string) => {
    if (!confirm(`${name1}さんと${name2}さんのペアを削除しますか？`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await IncompatiblePairsManager.deletePair(id);
      
      if (result.success) {
        toast.success('相性ペアを削除しました');
        await loadPairs();
      } else {
        toast.error(`削除に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting pair:', error);
      toast.error('相性ペアの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const filteredPairs = filterLocation === 'all' 
    ? pairs 
    : pairs.filter(pair => pair.location === filterLocation);

  const countByLocation = locations.reduce((acc, loc) => {
    acc[loc] = pairs.filter(pair => pair.location === loc && pair.is_active).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserX className="w-8 h-8" />
            相性ペア管理
          </h1>
          <p className="text-muted-foreground mt-2">
            相性の悪い従業員ペアを管理し、シフト生成時に考慮します
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
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総ペア数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pairs.filter(p => p.is_active).length}組</div>
          </CardContent>
        </Card>
        {locations.map(loc => (
          <Card key={loc}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {loc}拠点
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countByLocation[loc]}組</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={filterLocation === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterLocation('all')}
            >
              すべて
            </Button>
            {locations.map(loc => (
              <Button
                key={loc}
                variant={filterLocation === loc ? 'default' : 'outline'}
                onClick={() => setFilterLocation(loc)}
              >
                {loc}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 相性ペア一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>相性ペア一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : filteredPairs.length === 0 ? (
            <Alert>
              <AlertDescription>
                登録されている相性ペアはありません
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {filteredPairs.map((pair) => (
                <div
                  key={pair.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pair.employee_name_1}</span>
                      <span className="text-muted-foreground">⇄</span>
                      <span className="font-semibold">{pair.employee_name_2}</span>
                      <Badge variant="outline">{pair.location}</Badge>
                      <Badge variant={severityColors[pair.severity]}>
                        重要度: {severityLabels[pair.severity]}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ID: {pair.employee_id_1} ⇄ {pair.employee_id_2} | 理由: {pair.reason || 'なし'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(pair.id!, pair.employee_name_1, pair.employee_name_2)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>相性ペアを追加</DialogTitle>
            <DialogDescription>
              相性の悪い従業員ペアを登録してください
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">拠点</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => setFormData({ ...formData, location: value, employee1: '', employee2: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="拠点を選択" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="employee1">従業員1</Label>
              <Select
                value={formData.employee1}
                onValueChange={(value) => setFormData({ ...formData, employee1: value })}
                disabled={!formData.location}
              >
                <SelectTrigger>
                  <SelectValue placeholder="従業員を選択" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="employee2">従業員2</Label>
              <Select
                value={formData.employee2}
                onValueChange={(value) => setFormData({ ...formData, employee2: value })}
                disabled={!formData.employee1}
              >
                <SelectTrigger>
                  <SelectValue placeholder="従業員を選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map(emp => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="severity">重要度</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: 'high' | 'medium' | 'low') => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高（絶対に避ける）</SelectItem>
                  <SelectItem value="medium">中（できるだけ避ける）</SelectItem>
                  <SelectItem value="low">低（警告のみ）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">理由</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="理由を入力（任意）"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAdd} disabled={loading}>
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
