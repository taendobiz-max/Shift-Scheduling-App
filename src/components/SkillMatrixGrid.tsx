import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getEmployeesWithSkills, 
  getSkillMatrixBusinessGroups, 
  toggleEmployeeSkill,
  EmployeeWithSkills 
} from '@/utils/skillMatrixLoader';

interface SkillMatrixGridProps {
  isLoading: boolean;
  onDataChange?: () => void;
  onEmployeeClick?: (employee: EmployeeWithSkills) => void;
  selectedOffice?: string;
}

export function SkillMatrixGrid({ isLoading, onDataChange, onEmployeeClick, selectedOffice }: SkillMatrixGridProps) {
  const [employeesWithSkills, setEmployeesWithSkills] = useState<EmployeeWithSkills[]>([]);
  const [businessGroups, setBusinessGroups] = useState<string[]>([]);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadMatrixData();
  }, []);

  useEffect(() => {
    loadMatrixData();
  }, [selectedOffice]);

  const loadMatrixData = async () => {
    setIsLoadingMatrix(true);
    try {
      console.log('🔄 Loading matrix data with employee master linkage...');
      
      const [employeesData, groups] = await Promise.all([
        getEmployeesWithSkills(),
        getSkillMatrixBusinessGroups()
      ]);
      
      // Filter by selected office if specified
      const filteredEmployees = selectedOffice && selectedOffice !== 'all'
        ? employeesData.filter(emp => emp.office === selectedOffice)
        : employeesData;
      
      setEmployeesWithSkills(filteredEmployees);
      setBusinessGroups(groups);
      
      console.log(`✅ Matrix loaded: ${employeesData.length} employees (sorted by ID), ${groups.length} business groups`);
    } catch (error) {
      console.error('❌ Error loading matrix data:', error);
      toast.error('マトリクスデータの読み込みに失敗しました');
    } finally {
      setIsLoadingMatrix(false);
    }
  };

  const hasSkill = (employeeId: string, businessGroup: string): boolean => {
    const employee = employeesWithSkills.find(emp => emp.employee_id === employeeId);
    return employee?.skills.has(businessGroup) || false;
  };

  const handleSkillToggle = async (employeeId: string, businessGroup: string) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const employee = employeesWithSkills.find(emp => emp.employee_id === employeeId);
      const employeeName = employee?.employee_name || employeeId;
      
      console.log(`🔄 Toggling skill: ${employeeId} (${employeeName}) - ${businessGroup}`);
      const success = await toggleEmployeeSkill(employeeId, businessGroup);
      
      if (success) {
        // Update local state immediately for better UX
        const updatedEmployees = employeesWithSkills.map(emp => {
          if (emp.employee_id === employeeId) {
            const newSkills = new Set(emp.skills);
            if (newSkills.has(businessGroup)) {
              newSkills.delete(businessGroup);
              toast.success(`✅ DB保存完了: ${employeeName}の${businessGroup}を削除しました`);
            } else {
              newSkills.add(businessGroup);
              toast.success(`✅ DB保存完了: ${employeeName}の${businessGroup}を追加しました`);
            }
            return {
              ...emp,
              skills: newSkills,
              skillCount: newSkills.size
            };
          }
          return emp;
        });
        
        setEmployeesWithSkills(updatedEmployees);
        
        // Reload data to ensure consistency
        if (onDataChange) {
          onDataChange();
        }
      } else {
        toast.error('❌ DB保存失敗: スキルの更新に失敗しました');
      }
    } catch (error) {
      console.error('❌ Error toggling skill:', error);
      toast.error('❌ DB保存エラー: スキルの更新中にエラーが発生しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const getBusinessGroupEmployeeCount = (businessGroup: string): number => {
    return employeesWithSkills.filter(emp => emp.skills.has(businessGroup)).length;
  };

  const getTotalSkillsCount = (): number => {
    return employeesWithSkills.reduce((total, emp) => total + emp.skillCount, 0);
  };

  if (isLoading || isLoadingMatrix) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">マトリクスデータを読込中...</span>
        </div>
      </div>
    );
  }

  if (employeesWithSkills.length === 0 || businessGroups.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">マトリクス表示用のデータが見つかりません</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate minimum width needed for all columns
  const minWidth = 160 + (businessGroups.length * 128) + 80; // employee column + business groups + total column

  return (
    <Card>
      <CardHeader>
        <CardTitle>担当可能業務マトリクス</CardTitle>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>従業員: {employeesWithSkills.length}名</span>
          <span>業務グループ: {businessGroups.length}件</span>
          <span>総スキル: {getTotalSkillsCount()}件</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          {/* Main scrollable container with explicit overflow settings */}
          <div 
            className="overflow-x-auto overflow-y-auto h-[600px] w-full"
            style={{ 
              maxHeight: '600px',
              overflowX: 'auto',
              overflowY: 'auto'
            }}
          >
            <div 
              className="relative"
              style={{ 
                minWidth: `${minWidth}px`,
                width: 'max-content'
              }}
            >
              {/* Header Row */}
              <div className="flex border-b bg-muted/50 sticky top-0 z-20">
                <div className="w-40 p-3 border-r font-medium bg-background sticky left-0 z-30 min-w-[160px]">
                  従業員名 (ID順)
                </div>
                {businessGroups.map((group, index) => (
                  <div key={index} className="w-32 p-2 border-r text-center bg-background min-w-[128px] flex-shrink-0">
                    <div className="text-xs font-medium leading-tight break-words h-12 flex items-center justify-center">
                      {group}
                    </div>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {getBusinessGroupEmployeeCount(group)}名
                    </Badge>
                  </div>
                ))}
                <div className="w-20 p-3 text-center font-medium bg-background min-w-[80px] flex-shrink-0">
                  合計
                </div>
              </div>
              
              {/* Data Rows */}
              {employeesWithSkills.map((employee, employeeIndex) => (
                <div key={employeeIndex} className="flex border-b hover:bg-muted/30">
                  <div className="w-40 p-3 border-r font-medium bg-background/50 sticky left-0 z-10 min-w-[160px]">
                    <div className="text-sm">{employee.employee_name}</div>
                    <div className="text-xs text-muted-foreground">ID: {employee.employee_id}</div>
                  </div>
                  {businessGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="w-32 p-3 border-r text-center min-w-[128px] flex-shrink-0">
                      <Checkbox
                        checked={hasSkill(employee.employee_id, group)}
                        disabled={isUpdating}
                        onCheckedChange={() => handleSkillToggle(employee.employee_id, group)}
                        className="mx-auto cursor-pointer"
                      />
                    </div>
                  ))}
                  <div className="w-20 p-3 text-center min-w-[80px] flex-shrink-0">
                    <Badge variant="secondary">
                      {employee.skillCount}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {/* Summary Row */}
              <div className="flex border-b bg-muted/50 font-medium sticky bottom-0 z-10">
                <div className="w-40 p-3 border-r bg-background sticky left-0 z-20 min-w-[160px]">
                  合計
                </div>
                {businessGroups.map((group, index) => (
                  <div key={index} className="w-32 p-3 border-r text-center bg-background min-w-[128px] flex-shrink-0">
                    <Badge variant="default">
                      {getBusinessGroupEmployeeCount(group)}
                    </Badge>
                  </div>
                ))}
                <div className="w-20 p-3 text-center bg-background min-w-[80px] flex-shrink-0">
                  <Badge variant="default">
                    {getTotalSkillsCount()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p>✅ 従業員マスタ連携済み: 従業員名は従業員マスタから取得し、従業員ID昇順で表示</p>
          <p>✅ DB保存確認済み: チェックボックス編集時にSupabaseデータベースに即座に保存されます</p>
          <p>✓ チェックマーク: 担当可能業務（クリックして編集可能）</p>
          <p>📊 数値バッジ: 各従業員の担当可能業務数 / 各業務グループの対応可能従業員数</p>
          <p>🔄 横スクロール: すべての業務グループ（{businessGroups.length}件）を表示するため横にスクロールできます</p>
        </div>
      </CardContent>
    </Card>
  );
}