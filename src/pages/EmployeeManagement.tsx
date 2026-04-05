import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, UserCheck, UserX, RefreshCw, Home, Upload, Edit, Plus, CheckCircle, XCircle, Save, X as XIcon, Award, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { loadEmployeesFromExcel, reloadEmployeesFromExcel, EmployeeMaster, updateEmployeeInSupabase } from '@/utils/employeeExcelLoader';
import { AddEmployeeModal } from '@/components/AddEmployeeModal';
import { EmployeeSkillModal } from '@/components/EmployeeSkillModal';
import { getAllBusinessGroups } from '@/utils/businessGroupManager';
import { supabase } from '@/utils/supabaseClient';
import { OFFICES, TOKYO_TEAMS } from '@/constants';


export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeMaster[]>([]);
  const [businessGroups, setBusinessGroups] = useState<string[]>([]);
  const [filteredBusinessGroups, setFilteredBusinessGroups] = useState<string[]>([]);
  const [employeeSkills, setEmployeeSkills] = useState<Record<string, Set<string>>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EmployeeMaster>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [selectedEmployeeForSkill, setSelectedEmployeeForSkill] = useState<{ id: string; name: string; office?: string } | null>(null);
  const [activeTab, setActiveTab] = useState('employees');
  // スキルマトリクス一括保存用：未保存の変更を管理
  // key: "employeeId::businessGroup", value: true(追加) / false(削除)
  const [pendingSkillChanges, setPendingSkillChanges] = useState<Record<string, boolean>>({});
  const [isSavingSkills, setIsSavingSkills] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter employees when search term, selected office, or roll call filter changes
  useEffect(() => {
    filterEmployees();
    filterBusinessGroups();
  }, [employees, searchTerm, selectedOffice, businessGroups]);

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
      
      // Load employee skills from employee_skills table
      await loadEmployeeSkills(employeeData);
      
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

  // 従業員が点呼スキルを持っているかどうかを判定
  const hasRollCallSkill = (employeeId: string): boolean => {
    const skills = employeeSkills[employeeId];
    if (!skills) return false;
    return Array.from(skills).some(skill => skill.includes('点呼'));
  };

  // 点呼スキルを持つ従業員の数を計算
  const getRollCallCapableCount = (): number => {
    return employees.filter(emp => hasRollCallSkill(emp.employee_id || '')).length;
  };

  const loadEmployeeSkills = async (employeeData: EmployeeMaster[]) => {
    try {
      const { data: skillsData, error } = await supabase
        .from('skill_matrix')
        .select('employee_id, business_group');

      if (error) {
        console.error('❌ Error loading employee skills:', error);
        return;
      }

      const skillsMap: Record<string, Set<string>> = {};
      skillsData?.forEach(skill => {
        if (!skillsMap[skill.employee_id]) {
          skillsMap[skill.employee_id] = new Set();
        }
        skillsMap[skill.employee_id].add(skill.business_group);
      });

      setEmployeeSkills(skillsMap);
      console.log('✅ Loaded employee skills:', skillsMap);
    } catch (error) {
      console.error('💥 Error loading employee skills:', error);
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
    

    
    setFilteredEmployees(filtered);
  };

  const filterBusinessGroups = async () => {
    if (selectedOffice === 'all') {
      setFilteredBusinessGroups(businessGroups);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('business_groups')
        .select('name')
        .eq('営業所', selectedOffice)
        .order('name');

      if (error) {
        console.error('❌ Error filtering business groups:', error);
        setFilteredBusinessGroups(businessGroups);
        return;
      }

      const filtered = data?.map(bg => bg.name).filter(Boolean) || [];
      setFilteredBusinessGroups(filtered);
      console.log(`✅ Filtered ${filtered.length} business groups for office: ${selectedOffice}`);
    } catch (error) {
      console.error('💥 Error filtering business groups:', error);
      setFilteredBusinessGroups(businessGroups);
    }
  };

  const getUniqueOffices = () => {
    const offices = employees
      .map(emp => emp.office)
      .filter((office): office is string => office !== undefined && office !== null && office !== '');
    return [...new Set(offices)];
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
      
      // Ensure roll_call_capable is properly set
      const updateData: EmployeeMaster = {
        name: editFormData.name,
        office: editFormData.office,
        team: editFormData.team,
        display_order: editFormData.display_order,
        roll_call_capable: editFormData.roll_call_capable || false
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

    const currentCapable = employee.roll_call_capable || false;
    const newCapable = !currentCapable;

    try {
      const updateData: EmployeeMaster = {
        ...employee,
        roll_call_capable: newCapable
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



  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!employeeId) {
      toast.error('従業員IDが見つかりません');
      return;
    }

    // 確認ダイアログ
    if (!window.confirm(`${employeeName}を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }

    setIsSaving(true);
    try {
      console.log('🗑️ Deleting employee:', employeeId, employeeName);
      
      // まず、削除対象のレコードを確認
      const { data: checkData, error: checkError } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_id', employeeId);
      
      console.log('🔍 Records to delete:', checkData);
      console.log('🔍 Check error:', checkError);
      
      // Supabaseから従業員を削除
      const { data, error, count } = await supabase
        .from('employees')
        .delete({ count: 'exact' })
        .eq('employee_id', employeeId);

      console.log('🔍 Delete result - data:', data);
      console.log('🔍 Delete result - error:', error);
      console.log('🔍 Delete result - count:', count);

      if (error) {
        console.error('❌ Error deleting employee:', error);
        toast.error(`従業員の削除に失敗しました: ${error.message}`);
        return;
      }

      console.log('✅ Employee deleted successfully');
      toast.success(`${employeeName}を削除しました`);
      await loadData(); // データを再読み込み
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      toast.error('従業員の削除中にエラーが発生しました');
    } finally {
      setIsSaving(false);
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
          <Button onClick={() => setIsAddModalOpen(true)} disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            新規登録
          </Button>
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
                  {getRollCallCapableCount()}名
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
            <div className="flex-1">
              <Input
                placeholder="従業員名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employees">
            <Users className="h-4 w-4 mr-2" />
            従業員一覧
          </TabsTrigger>
          <TabsTrigger value="matrix">
            <Award className="h-4 w-4 mr-2" />
            スキルマトリクス
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
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
                              onValueChange={(value) => {
                                handleEditFormChange('office', value);
                              // 営業所が東京以外の場合は班をクリア
                              if (value !== '東京') {
                                handleEditFormChange('team', '');
                                }
                              }}
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
                            <label className="text-sm font-medium">班（東京のみ）</label>
                            <Select
                              value={editFormData.team || ''}
                              onValueChange={(value) => handleEditFormChange('team', value)}
                              disabled={editFormData.office !== '東京'}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder={
                                  editFormData.office === '東京' 
                                    ? "班を選択" 
                                    : "東京営業所のみ"
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {TOKYO_TEAMS.map((team) => (
                                  <SelectItem key={team} value={team}>{team}</SelectItem>
                                ))}
                                <SelectItem value="無し">無し</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">点呼対応</label>
                            <div className="flex items-center space-x-2 mt-3">
                              <Checkbox
                                checked={editFormData.roll_call_capable || false}
                                onCheckedChange={(checked) => {
                                  handleEditFormChange('roll_call_capable', checked);
                                }}
                              />
                              <span className="text-sm">対応可能</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">表示順</label>
                            <Input
                              type="number"
                              value={editFormData.display_order || ''}
                              onChange={(e) => handleEditFormChange('display_order', parseInt(e.target.value) || 0)}
                              className="mt-1"
                              placeholder="9999"
                            />
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
                      <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-center">
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">ID: {employee.employee_id}</div>
                        </div>
                        <div>
                          <div className="font-medium">{employee.office || '-'}</div>
                          <div className="text-sm text-muted-foreground">営業所</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {hasRollCallSkill(employee.employee_id || '') ? (
                            <Badge className="bg-green-500">点呼対応可</Badge>
                          ) : (
                            <Badge className="bg-gray-400">点呼対応不可</Badge>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{employee.display_order || 9999}</div>
                          <div className="text-sm text-muted-foreground">表示順</div>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmployeeForSkill({ id: employee.employee_id || '', name: employee.name || '', office: employee.office });
                              setIsSkillModalOpen(true);
                            }}
                          >
                            <Award className="h-4 w-4 mr-1" />
                            スキル
                          </Button>
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
                          <Button 
                            size="sm"
                            onClick={() => handleDeleteEmployee(employee.employee_id || '', employee.name || '不明')}
                            disabled={isSaving}
                            title="削除"
                            className="bg-red-500 hover:bg-red-600 text-white"
                          >
                            <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        {/* スキルマトリクスタブ */}
        <TabsContent value="matrix" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>スキルマトリクス</CardTitle>
                  <CardDescription>
                    従業員のスキル保有状況をマトリクス形式で表示します
                    {Object.keys(pendingSkillChanges).length > 0 && (
                      <span className="ml-2 text-amber-600 font-medium">
                        （{Object.keys(pendingSkillChanges).length}件の未保存の変更があります）
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {Object.keys(pendingSkillChanges).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPendingSkillChanges({});
                        toast.info('変更をリセットしました');
                      }}
                      disabled={isSavingSkills}
                    >
                      <XIcon className="h-4 w-4 mr-1" />
                      リセット
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (Object.keys(pendingSkillChanges).length === 0) return;
                      setIsSavingSkills(true);
                      try {
                        const { addEmployeeSkill, removeEmployeeSkill } = await import('@/utils/skillMatrixLoader');
                        const entries = Object.entries(pendingSkillChanges);
                        let successCount = 0;
                        let failCount = 0;
                        for (const [key, shouldAdd] of entries) {
                          const [empId, group] = key.split('::');
                          const ok = shouldAdd
                            ? await addEmployeeSkill(empId, group)
                            : await removeEmployeeSkill(empId, group);
                          if (ok) successCount++; else failCount++;
                        }
                        setPendingSkillChanges({});
                        await loadEmployeeSkills(employees);
                        if (failCount === 0) {
                          toast.success(`✅ ${successCount}件のスキルを更新しました`);
                        } else {
                          toast.warning(`⚠️ ${successCount}件成功、${failCount}件失敗しました`);
                        }
                      } catch (error) {
                        console.error('Skill save error:', error);
                        toast.error('❌ スキルの保存に失敗しました');
                      } finally {
                        setIsSavingSkills(false);
                      }
                    }}
                    disabled={isSavingSkills || Object.keys(pendingSkillChanges).length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSavingSkills ? '保存中...' : '更新'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px] border">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-muted">
                      <th className="border p-2 text-left font-medium sticky left-0 bg-muted z-30 whitespace-nowrap min-w-[150px] w-[150px]">従業員名</th>
                      <th className="border p-2 text-left font-medium sticky left-[150px] bg-muted z-20 whitespace-nowrap min-w-[100px] w-[100px]">営業所</th>
                      {filteredBusinessGroups.map(group => (
                        <th key={group} className="border p-2 text-center font-medium text-sm whitespace-nowrap relative z-0 min-w-[120px]">
                          {group}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp, index) => (
                      <tr key={emp.employee_id || index} className="hover:bg-muted/50">
                        <td className="border p-2 font-medium sticky left-0 bg-background z-20 whitespace-nowrap min-w-[150px] w-[150px]">{emp.name}</td>
                        <td className="border p-2 sticky left-[150px] bg-background z-10 whitespace-nowrap min-w-[100px] w-[100px]">{emp.office || '-'}</td>
                        {filteredBusinessGroups.map(group => {
                          const empId = emp.employee_id || '';
                          const key = `${empId}::${group}`;
                          const empSkills = employeeSkills[empId] || new Set();
                          const savedState = empSkills.has(group);
                          // pendingに変更があればそちらを優先
                          const currentState = key in pendingSkillChanges ? pendingSkillChanges[key] : savedState;
                          const isDirty = key in pendingSkillChanges;
                          return (
                            <td key={group} className={`border p-2 text-center relative z-0${isDirty ? ' bg-amber-50' : ''}`}>
                              <Checkbox
                                checked={currentState}
                                onCheckedChange={() => {
                                  const newState = !currentState;
                                  setPendingSkillChanges(prev => {
                                    const next = { ...prev };
                                    // 変更後の状態がDB保存済みの状態と同じなら、pendingから削除（変更なし扱い）
                                    if (newState === savedState) {
                                      delete next[key];
                                    } else {
                                      next[key] = newState;
                                    }
                                    return next;
                                  });
                                }}
                                className="mx-auto cursor-pointer"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEmployeeAdded={loadData}
      />

      {/* Employee Skill Modal */}
      {selectedEmployeeForSkill && (
        <EmployeeSkillModal
          isOpen={isSkillModalOpen}
          onClose={() => {
            setIsSkillModalOpen(false);
            setSelectedEmployeeForSkill(null);
          }}
          employeeId={selectedEmployeeForSkill.id}
          employeeName={selectedEmployeeForSkill.name}
          employeeOffice={selectedEmployeeForSkill.office}
          onSkillUpdate={() => {
            // スキル更新時に従業員データを再読み込み
            loadData();
          }}
        />
      )}
    </div>
  );
}

