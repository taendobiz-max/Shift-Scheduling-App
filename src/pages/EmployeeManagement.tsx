import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, UserCheck, UserX, RefreshCw, Home, Upload, Edit, Plus, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { loadEmployeesFromExcel, reloadEmployeesFromExcel, EmployeeMaster, updateEmployeeInSupabase } from '@/utils/employeeExcelLoader';
import { getAllBusinessGroups } from '@/utils/businessGroupManager';
import { EditEmployeeModal } from '@/components/EditEmployeeModal';
import { AddEmployeeModal } from '@/components/AddEmployeeModal';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeMaster[]>([]);
  const [businessGroups, setBusinessGroups] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [rollCallFilter, setRollCallFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeMaster | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
    
    // Filter by search term - using English column names
    if (searchTerm) {
      filtered = filtered.filter(employee => 
        employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.office?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by selected office - using English column names
    if (selectedOffice !== 'all') {
      filtered = filtered.filter(employee => employee.office === selectedOffice);
    }

    // Filter by roll call capability
    if (rollCallFilter !== 'all') {
      if (rollCallFilter === 'capable') {
        filtered = filtered.filter(employee => 
          employee.roll_call_capable === true || employee.roll_call_duty === '1'
        );
      } else if (rollCallFilter === 'not_capable') {
        filtered = filtered.filter(employee => 
          employee.roll_call_capable === false || employee.roll_call_duty === '0'
        );
      }
    }
    
    setFilteredEmployees(filtered);
  };

  const getStatusBadge = (employee: EmployeeMaster) => {
    const isCapable = employee.roll_call_capable || employee.roll_call_duty === '1';
    
    if (isCapable) {
      return { variant: 'default' as const, text: '点呼対応可', icon: CheckCircle };
    } else if (employee.roll_call_capable === false || employee.roll_call_duty === '0') {
      return { variant: 'secondary' as const, text: '点呼対応不可', icon: XCircle };
    }
    return { variant: 'outline' as const, text: '未設定', icon: UserX };
  };

  const handleEditEmployee = (employee: EmployeeMaster) => {
    setEditingEmployee(employee);
    setIsEditModalOpen(true);
  };

  const handleEmployeeUpdated = () => {
    // Reload data after employee update
    loadData();
  };

  const handleEmployeeAdded = () => {
    // Reload data after employee addition
    loadData();
  };

  const handleQuickToggleRollCall = async (employee: EmployeeMaster) => {
    if (!employee.employee_id) return;

    const currentCapable = employee.roll_call_capable || employee.roll_call_duty === '1';
    const newCapable = !currentCapable;

    try {
      const success = await updateEmployeeInSupabase(employee.employee_id, {
        roll_call_capable: newCapable,
        roll_call_duty: newCapable ? '1' : '0'
      });

      if (success) {
        toast.success(`${employee.name}の点呼対応を${newCapable ? '可能' : '不可'}に変更しました`);
        loadData(); // Reload to reflect changes
      } else {
        toast.error('点呼対応設定の変更に失敗しました');
      }
    } catch (error) {
      console.error('Error toggling roll call capability:', error);
      toast.error('点呼対応設定の変更中にエラーが発生しました');
    }
  };

  const getUniqueOffices = () => {
    const offices = employees.map(emp => emp.office).filter(Boolean);
    return [...new Set(offices)];
  };

  const getRollCallStats = () => {
    const capable = employees.filter(e => e.roll_call_capable === true || e.roll_call_duty === '1').length;
    const notCapable = employees.filter(e => e.roll_call_capable === false || e.roll_call_duty === '0').length;
    const unset = employees.length - capable - notCapable;
    return { capable, notCapable, unset };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-lg">データを読込中...</span>
          </div>
        </div>
      </div>
    );
  }

  const rollCallStats = getRollCallStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">従業員管理</h1>
          <p className="text-muted-foreground mt-2">従業員データの表示・管理・点呼対応設定</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/'} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            ホーム
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            新規追加
          </Button>
          <Button onClick={handleForceReload} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Excel再読込
          </Button>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              総従業員数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <UserCheck className="h-4 w-4 mr-2" />
              表示中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEmployees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              点呼対応可
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{rollCallStats.capable}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <XCircle className="h-4 w-4 mr-2 text-red-600" />
              点呼対応不可
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rollCallStats.notCapable}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">営業所数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUniqueOffices().length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>フィルター・検索</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="氏名、従業員ID、営業所で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                return (
                  <div key={employee.employee_id || index} className="border rounded-lg p-4">
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
                        <Badge variant={status.variant} className="flex items-center gap-1">
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
                          onClick={() => handleEditEmployee(employee)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employee={editingEmployee}
        onEmployeeUpdated={handleEmployeeUpdated}
      />

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEmployeeAdded={handleEmployeeAdded}
      />
    </div>
  );
}