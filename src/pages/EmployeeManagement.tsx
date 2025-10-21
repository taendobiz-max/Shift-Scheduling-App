import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, UserCheck, UserX, RefreshCw, Home, Upload, Edit, Plus, CheckCircle, XCircle, Save, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { loadEmployeesFromExcel, reloadEmployeesFromExcel, EmployeeMaster, updateEmployeeInSupabase } from '@/utils/employeeExcelLoader';
import { getAllBusinessGroups } from '@/utils/businessGroupManager';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeMaster[]>([]);
  const [businessGroups, setBusinessGroups] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [rollCallFilter, setRollCallFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EmployeeMaster>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter employees when search term, selected office, or roll call filter changes
  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, selectedOffice, rollCallFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading employee and business group data...');
      
      // Load employees and business groups
      const [employeeData, groupData] = await Promise.all([
        loadEmployeesFromExcel(),
        getAllBusinessGroups()
      ]);
      
      console.log('📊 Loaded employee data:', employeeData);
      console.log('📋 Available business groups:', groupData);
      
      setEmployees(employeeData);
      setBusinessGroups(groupData);
      
      if (employeeData.length === 0) {
        toast.error('従業員データが見つかりません。Excelファイルからデータをインポートしてください。');
      } else {
        toast.success(`${employeeData.length}名の従業員データを読み込みました`);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast.error('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceReload = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Force reloading employee data from Excel...');
      const employeeData = await reloadEmployeesFromExcel();
      setEmployees(employeeData);
      
      if (employeeData.length > 0) {
        toast.success(`${employeeData.length}名の従業員データを強制再読み込みしました`);
      } else {
        toast.error('従業員データの読み込みに失敗しました');
      }
    } catch (error) {
      console.error('❌ Error force reloading data:', error);
      toast.error('データの強制再読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(employee => 
        employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.office?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by selected office
    if (selectedOffice !== 'all') {
      filtered = filtered.filter(employee => employee.office === selectedOffice);
    }
    
    // Filter by roll call capability
    if (rollCallFilter === 'capable') {
      filtered = filtered.filter(employee => 
        employee.roll_call_capable === true || employee.roll_call_duty === '1'
      );
    } else if (rollCallFilter === 'not_capable') {
      filtered = filtered.filter(employee => 
        employee.roll_call_capable !== true && employee.roll_call_duty !== '1'
      );
    }
    
    setFilteredEmployees(filtered);
  };

  const getUniqueOffices = () => {
    const offices = employees
      .map(emp => emp.office)
      .filter((office): office is string => office !== undefined && office !== null && office !== '');
    return [...new Set(offices)];
  };

  const getStatusBadge = (employee: EmployeeMaster) => {
    if (employee.roll_call_capable || employee.roll_call_duty === '1') {
      return { variant: 'default' as const, text: '対応可能', icon: UserCheck };
    } else if (employee.roll_call_duty === '0') {
      return { variant: 'secondary' as const, text: '対応不可', icon: UserX };
    }
    return { variant: 'outline' as const, text: '未設定', icon: UserX };
  };

  const handleStartEdit = (employee: EmployeeMaster) => {
    console.log('📝 Starting edit for employee:', employee);
    setEditingEmployeeId(employee.employee_id || null);
    setEditFormData({ ...employee });
  };

  const handleCancelEdit = () => {
    setEditingEmployeeId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (employeeId: string) => {
    if (!employeeId) {
      toast.error('従業員IDが見つかりません');
      return;
    }

    setIsSaving(true);
    try {
      console.log('💾 Saving employee data for ID:', employeeId);
      console.log('💾 Edit form data:', JSON.stringify(editFormData, null, 2));
      
      // Ensure roll_call_capable and roll_call_duty are properly set
      const updateData: EmployeeMaster = {
        name: editFormData.name,
        office: editFormData.office,
        roll_call_capable: editFormData.roll_call_capable || false,
        roll_call_duty: editFormData.roll_call_duty || '0'
      };
      
      console.log('💾 Update data to send:', JSON.stringify(updateData, null, 2));
      
      const success = await updateEmployeeInSupabase(employeeId, updateData);
      
      if (success) {
        toast.success('従業員データを更新しました');
        setEditingEmployeeId(null);
        setEditFormData({});
        await loadData(); // Reload data
      } else {
        toast.error('従業員データの更新に失敗しました');
      }
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      toast.error('従業員データの更新中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickToggleRollCall = async (employee: EmployeeMaster) => {
    if (!employee.employee_id) return;

    const currentCapable = employee.roll_call_capable || employee.roll_call_duty === '1';
    const newCapable = !currentCapable;

    try {
      const updateData: EmployeeMaster = {
        ...employee,
        roll_call_capable: newCapable,
        roll_call_duty: newCapable ? '1' : '0'
      };

      const success = await updateEmployeeInSupabase(employee.employee_id, updateData);
      
      if (success) {
        toast.success(`${employee.name}の点呼対応を${newCapable ? '可能' : '不可'}に変更しました`);
        await loadData();
      } else {
        toast.error('点呼対応の変更に失敗しました');
      }
    } catch (error) {
      console.error('Error toggling roll call:', error);
      toast.error('点呼対応の変更中にエラーが発生しました');
    }
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">従業員データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">従業員管理</h1>
          <p className="text-gray-600 mt-2">従業員情報の確認・編集を行います</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleForceReload} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            再読み込み
          </Button>
          <Link to="/">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              ホーム
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">総従業員数</p>
                <p className="text-2xl font-bold">{employees.length}名</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">点呼対応可能</p>
                <p className="text-2xl font-bold">
                  {employees.filter(emp => emp.roll_call_capable || emp.roll_call_duty === '1').length}名
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">表示中</p>
                <p className="text-2xl font-bold">{filteredEmployees.length}名</p>
              </div>
              <Search className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>検索・フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="従業員名、ID、営業所で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="md:w-48">
              <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                <SelectTrigger>
                  <SelectValue placeholder="営業所" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {getUniqueOffices().map(office => (
                    <SelectItem key={office} value={office}>{office}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:w-48">
              <Select value={rollCallFilter} onValueChange={setRollCallFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="点呼対応" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="capable">対応可能</SelectItem>
                  <SelectItem value="not_capable">対応不可</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>従業員一覧</CardTitle>
          <CardDescription>
            {filteredEmployees.length > 0 
              ? `${filteredEmployees.length}名の従業員を表示中`
              : '表示する従業員データがありません'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">従業員データが見つかりません</p>
              <p className="text-sm text-muted-foreground mt-2">
                検索条件を変更するか、データを更新してください
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmployees.map((employee, index) => {
                const status = getStatusBadge(employee);
                const StatusIcon = status.icon;
                const isEditing = editingEmployeeId === employee.employee_id;
                
                return (
                  <div key={employee.employee_id || index} className="border rounded-lg p-4">
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">従業員ID</label>
                            <Input
                              value={editFormData.employee_id || ''}
                              disabled
                              className="bg-muted mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">氏名</label>
                            <Input
                              value={editFormData.name || ''}
                              onChange={(e) => handleEditFormChange('name', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">営業所</label>
                            <Select
                              value={editFormData.office || ''}
                              onValueChange={(value) => handleEditFormChange('office', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="営業所を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="川越">川越</SelectItem>
                                <SelectItem value="東京">東京</SelectItem>
                                <SelectItem value="川口">川口</SelectItem>
                                <SelectItem value="その他">その他</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">点呼対応</label>
                            <div className="flex items-center space-x-2 mt-3">
                              <Checkbox
                                checked={editFormData.roll_call_capable || editFormData.roll_call_duty === '1'}
                                onCheckedChange={(checked) => {
                                  handleEditFormChange('roll_call_capable', checked);
                                  handleEditFormChange('roll_call_duty', checked ? '1' : '0');
                                }}
                              />
                              <span className="text-sm">対応可能</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <XIcon className="h-4 w-4 mr-1" />
                            キャンセル
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleSaveEdit(employee.employee_id || '')}
                            disabled={isSaving}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {isSaving ? '保存中...' : '保存'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">ID: {employee.employee_id}</div>
                        </div>
                        <div>
                          <div className="font-medium">{employee.office || '-'}</div>
                          <div className="text-sm text-muted-foreground">営業所</div>
                        </div>
                        <div>
                          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {status.text}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={employee.roll_call_capable || employee.roll_call_duty === '1'}
                            onCheckedChange={() => handleQuickToggleRollCall(employee)}
                          />
                          <span className="text-sm">点呼対応</span>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStartEdit(employee)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            編集
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

