import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, Award, BookOpen, RefreshCw, Home, Filter, Grid, List, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';
import { SkillMatrixGrid } from '@/components/SkillMatrixGrid';
import { AddSkillAssignmentModal } from '@/components/AddSkillAssignmentModal';
import { EditSkillAssignmentModal } from '@/components/EditSkillAssignmentModal';

interface Employee {
  employee_id: string;
  name: string;
}

interface EmployeeSkillSummary {
  employee_id: string;
  employee_name: string;
  skills: {
    business_group: string;
    skill_level: string;
    skill_name: string;
  }[];
}

export default function SkillMatrixManagement() {
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkillSummary[]>([]);
  const [filteredEmployeeSkills, setFilteredEmployeeSkills] = useState<EmployeeSkillSummary[]>([]);
  const [businessGroups, setBusinessGroups] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBusinessGroup, setSelectedBusinessGroup] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matrix');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter employees when search term or selected business group changes
  useEffect(() => {
    filterEmployeeSkills();
  }, [employeeSkills, searchTerm, selectedBusinessGroup]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Starting data load process...');
      
      // Step 1: Load employees directly from database
      console.log('📊 Step 1: Loading employees...');
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('employee_id, name')
        .order('name');

      if (employeesError) {
        console.error('❌ Error loading employees:', employeesError);
        throw new Error(`従業員データの読み込みエラー: ${employeesError.message}`);
      }

      console.log('✅ Employees loaded:', employees?.length || 0);
      
      if (!employees || employees.length === 0) {
        console.warn('⚠️ No employees found in database');
        setEmployeeSkills([]);
        setBusinessGroups([]);
        toast.error('従業員データが見つかりません。従業員データをインポートしてください。');
        return;
      }

      // Step 2: Load skill matrix data
      console.log('📊 Step 2: Loading skill matrix...');
      const { data: skillMatrix, error: skillError } = await supabase
        .from('skill_matrix')
        .select('*')
        .order('employee_id, business_group');

      if (skillError) {
        console.error('❌ Error loading skill matrix:', skillError);
        // Don't throw error here, just log it and continue with empty skills
        console.warn('⚠️ Continuing without skill data');
      }

      console.log('✅ Skills loaded:', skillMatrix?.length || 0);

      // Step 3: Create employee skill summary
      console.log('📊 Step 3: Creating employee skill summary...');
      const employeeSummary: EmployeeSkillSummary[] = employees.map(employee => {
        const employeeSkills = skillMatrix?.filter(skill => skill.employee_id === employee.employee_id) || [];
        
        return {
          employee_id: employee.employee_id,
          employee_name: employee.name,
          skills: employeeSkills.map(skill => ({
            business_group: skill.business_group || '',
            skill_level: skill.skill_level || '',
            skill_name: skill.skill_name || skill.business_group || ''
          }))
        };
      });

      console.log('✅ Employee summary created:', employeeSummary.length);

      // Step 4: Extract unique business groups
      console.log('📊 Step 4: Extracting business groups...');
      const allBusinessGroups = new Set<string>();
      
      // From skill matrix
      skillMatrix?.forEach(skill => {
        if (skill.business_group) {
          allBusinessGroups.add(skill.business_group);
        }
      });

      // Also check business groups table
      try {
        const { data: businessGroupsData, error: bgError } = await supabase
          .from('business_groups')
          .select('name');
        
        if (!bgError && businessGroupsData) {
          businessGroupsData.forEach(bg => {
            if (bg.name) {
              allBusinessGroups.add(bg.name);
            }
          });
        }
      } catch (bgError) {
        console.warn('⚠️ Could not load business groups table:', bgError);
      }

      const uniqueBusinessGroups = Array.from(allBusinessGroups).sort();
      console.log('✅ Business groups extracted:', uniqueBusinessGroups.length);

      // Step 5: Set state
      setEmployeeSkills(employeeSummary);
      setBusinessGroups(uniqueBusinessGroups);
      
      console.log('✅ Data loading completed successfully');
      toast.success(`${employeeSummary.length}名の従業員データを読み込みました`);
      
    } catch (error) {
      console.error('❌ Critical error in loadData:', error);
      setEmployeeSkills([]);
      setBusinessGroups([]);
      toast.error(`データの読み込みに失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEmployeeSkills = () => {
    let filtered = employeeSkills;
    
    // Filter by search term (employee name)
    if (searchTerm) {
      filtered = filtered.filter(employee => 
        employee.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by selected business group
    if (selectedBusinessGroup !== 'all') {
      filtered = filtered.filter(employee => 
        employee.skills.some(skill => skill.business_group === selectedBusinessGroup)
      );
    }
    
    setFilteredEmployeeSkills(filtered);
  };

  const getSkillLevelBadge = (skillLevel: string) => {
    switch (skillLevel) {
      case '1':
      case '高':
        return { variant: 'default' as const, text: '高レベル' };
      case '2':
      case '中':
        return { variant: 'secondary' as const, text: '中レベル' };
      case '3':
      case '低':
        return { variant: 'outline' as const, text: '低レベル' };
      case '対応可能':
        return { variant: 'default' as const, text: '対応可能' };
      case '経験あり':
        return { variant: 'secondary' as const, text: '経験あり' };
      case '研修中':
        return { variant: 'outline' as const, text: '研修中' };
      default:
        return { variant: 'outline' as const, text: skillLevel || '未設定' };
    }
  };

  const getTotalSkillsCount = () => {
    return employeeSkills.reduce((total, employee) => total + employee.skills.length, 0);
  };

  const getEmployeesWithSkillCount = (businessGroup: string) => {
    return employeeSkills.filter(employee => 
      employee.skills.some(skill => skill.business_group === businessGroup)
    ).length;
  };

  const handleAddSuccess = () => {
    console.log('🔄 Reloading data after successful addition');
    loadData();
  };

  const handleEditSuccess = () => {
    console.log('🔄 Reloading data after successful edit');
    loadData();
  };

  const handleEmployeeClick = (employeeName: string, employeeId: string) => {
    console.log('🔄 Opening edit modal for employee:', employeeName, employeeId);
    setSelectedEmployee({
      employee_id: employeeId,
      name: employeeName
    });
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-lg">担当可能業務データを読込中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">担当可能業務管理</h1>
          <p className="text-muted-foreground mt-2">従業員ごとの担当可能業務とスキルレベルの管理</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            新規登録
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            ホーム
          </Button>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              対象従業員数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeSkills.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Award className="h-4 w-4 mr-2" />
              総スキル数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalSkillsCount()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              業務グループ数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businessGroups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              表示中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEmployeeSkills.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Display Mode Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            マトリクス表示
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            一覧表示
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-6">
          <SkillMatrixGrid 
            isLoading={isLoading} 
            onDataChange={loadData}
            onEmployeeClick={handleEmployeeClick}
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
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
                      placeholder="従業員名で検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="md:w-64">
                  <Select value={selectedBusinessGroup} onValueChange={setSelectedBusinessGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="業務グループ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべての業務グループ</SelectItem>
                      {businessGroups.map(group => (
                        <SelectItem key={group} value={group}>
                          {group} ({getEmployeesWithSkillCount(group)}名)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Skills List */}
          <Card>
            <CardHeader>
              <CardTitle>従業員別担当可能業務一覧</CardTitle>
              <CardDescription>
                {filteredEmployeeSkills.length > 0 
                  ? `${filteredEmployeeSkills.length}名の従業員の担当可能業務を表示中（従業員名をクリックして編集）`
                  : '表示する担当可能業務データがありません'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEmployeeSkills.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">担当可能業務データが見つかりません</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    検索条件を変更するか、「新規登録」ボタンからデータを追加してください
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredEmployeeSkills.map((employee, index) => (
                    <div key={employee.employee_id || index} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <button
                            onClick={() => handleEmployeeClick(employee.employee_name, employee.employee_id)}
                            className="text-lg font-semibold hover:text-blue-600 hover:underline cursor-pointer"
                          >
                            {employee.employee_name}
                          </button>
                          <p className="text-sm text-muted-foreground">
                            ID: {employee.employee_id} | 担当可能業務: {employee.skills.length}件
                          </p>
                        </div>
                      </div>
                      
                      {employee.skills.length === 0 ? (
                        <p className="text-muted-foreground text-sm">担当可能業務が設定されていません</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {employee.skills.map((skill, skillIndex) => {
                            const levelBadge = getSkillLevelBadge(skill.skill_level);
                            return (
                              <div key={skillIndex} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{skill.business_group}</div>
                                </div>
                                <Badge variant={levelBadge.variant} className="ml-2">
                                  {levelBadge.text}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddSkillAssignmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <EditSkillAssignmentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEmployee(null);
        }}
        onSuccess={handleEditSuccess}
        employee={selectedEmployee}
      />
    </div>
  );
}