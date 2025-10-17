import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';

interface Employee {
  employee_id: string;
  name: string;
}

interface BusinessGroup {
  id: string;
  name: string;
}

interface AddSkillAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const skillLevels = [
  { value: '対応可能', label: '対応可能' },
  { value: '経験あり', label: '経験あり' },
  { value: '研修中', label: '研修中' },
];

export const AddSkillAssignmentModal: React.FC<AddSkillAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedBusinessGroups, setSelectedBusinessGroups] = useState<string[]>([]);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      loadBusinessGroups();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      console.log('🔄 Loading employees...');
      const { data, error } = await supabase
        .from('app_9213e72257_employees')
        .select('employee_id, name')
        .order('name');

      if (error) {
        console.error('❌ Error loading employees:', error);
        throw error;
      }
      
      console.log('✅ Loaded employees:', data?.length || 0);
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('従業員データの読み込みに失敗しました。');
    }
  };

  const loadBusinessGroups = async () => {
    setIsLoadingData(true);
    try {
      console.log('🔄 Loading business groups for skill assignment...');
      
      // Load from business_groups table first
      const { data: businessGroupsData, error: businessGroupsError } = await supabase
        .from('app_9213e72257_business_groups')
        .select('*')
        .order('name');

      if (businessGroupsError) {
        console.error('❌ Error loading business groups:', businessGroupsError);
        throw businessGroupsError;
      }

      console.log('✅ Loaded business groups from main table:', businessGroupsData?.length || 0);

      // Also check business_master table for additional groups
      const { data: masterData, error: masterError } = await supabase
        .from('app_9213e72257_business_master')
        .select('業務グループ')
        .not('業務グループ', 'is', null)
        .neq('業務グループ', '');

      let allBusinessGroups = businessGroupsData || [];

      if (!masterError && masterData) {
        const uniqueMasterGroups = Array.from(new Set(
          masterData.map(item => item.業務グループ).filter(Boolean)
        ));
        
        console.log('📋 Found groups in business_master:', uniqueMasterGroups.length);
        
        // Check if any groups from business_master are missing from business_groups
        const existingGroupNames = new Set(businessGroupsData?.map(g => g.name) || []);
        const missingGroups = uniqueMasterGroups.filter(name => !existingGroupNames.has(name));
        
        if (missingGroups.length > 0) {
          console.log('⚠️ Missing groups found, creating them:', missingGroups);
          
          // Create missing business groups
          const missingGroupsData = missingGroups.map(name => ({
            name,
            description: `${name}の業務グループ（業務マスターから自動作成）`
          }));
          
          const { data: insertedData, error: insertError } = await supabase
            .from('app_9213e72257_business_groups')
            .insert(missingGroupsData)
            .select();
          
          if (!insertError && insertedData) {
            console.log('✅ Created missing business groups:', insertedData.length);
            allBusinessGroups = [...allBusinessGroups, ...insertedData];
            toast.success(`${insertedData.length}件の業務グループを自動作成しました。`);
          }
        }
      }

      // Sort all business groups
      allBusinessGroups.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log('📊 Total business groups available:', allBusinessGroups.length);
      console.log('📋 Business groups:', allBusinessGroups.map(g => g.name));
      
      setBusinessGroups(allBusinessGroups);
      
      if (allBusinessGroups.length === 0) {
        toast.error('業務グループが登録されていません。マスタデータ管理で業務グループを登録してください。');
      } else {
        console.log(`✅ Successfully loaded ${allBusinessGroups.length} business groups`);
      }
    } catch (error) {
      console.error('Error loading business groups:', error);
      toast.error('業務グループデータの読み込みに失敗しました。');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleBusinessGroupToggle = (groupName: string) => {
    setSelectedBusinessGroups(prev => {
      if (prev.includes(groupName)) {
        return prev.filter(name => name !== groupName);
      } else {
        return [...prev, groupName];
      }
    });
  };

  const removeBusinessGroup = (groupName: string) => {
    setSelectedBusinessGroups(prev => prev.filter(name => name !== groupName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee || selectedBusinessGroups.length === 0 || !selectedSkillLevel) {
      toast.error('すべての項目を選択してください。');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Registering skill assignments...', {
        employee: selectedEmployee,
        businessGroups: selectedBusinessGroups,
        skillLevel: selectedSkillLevel
      });

      // Check for existing records for each selected business group
      const duplicateChecks = await Promise.all(
        selectedBusinessGroups.map(async (businessGroup) => {
          const { data, error } = await supabase
            .from('app_9213e72257_skill_matrix')
            .select('id')
            .eq('employee_id', selectedEmployee)
            .eq('business_group', businessGroup)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          return { businessGroup, exists: !!data };
        })
      );

      const existingGroups = duplicateChecks
        .filter(check => check.exists)
        .map(check => check.businessGroup);

      if (existingGroups.length > 0) {
        toast.error(`以下の業務グループは既に登録されています: ${existingGroups.join(', ')}`);
        return;
      }

      // Insert new skill assignments for all selected business groups
      const insertData = selectedBusinessGroups.map(businessGroup => ({
        employee_id: selectedEmployee,
        skill_name: businessGroup,
        business_group: businessGroup,
        skill_level: selectedSkillLevel,
      }));

      console.log('📝 Inserting data:', insertData);

      const { error: insertError } = await supabase
        .from('app_9213e72257_skill_matrix')
        .insert(insertData);

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ Successfully registered skill assignments');
      toast.success(`${selectedBusinessGroups.length}件の担当可能業務を登録しました。`);

      // Reset form
      setSelectedEmployee('');
      setSelectedBusinessGroups([]);
      setSelectedSkillLevel('');
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding skill assignments:', error);
      toast.error('担当可能業務の登録に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedEmployee('');
    setSelectedBusinessGroups([]);
    setSelectedSkillLevel('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>担当可能業務の新規登録</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">従業員</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="従業員を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.employee_id} value={employee.employee_id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>業務グループ（複数選択可）</Label>
            <div className="text-xs text-gray-500 mb-2">
              {isLoadingData ? '読み込み中...' : `${businessGroups.length}件の業務グループが利用可能`}
            </div>
            {isLoadingData ? (
              <div className="border rounded-md p-3 text-center">
                <p className="text-sm text-gray-500">業務グループを読み込み中...</p>
              </div>
            ) : (
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                {businessGroups.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">業務グループが見つかりません</p>
                    <p className="text-xs text-gray-400">マスタデータ管理で業務グループを登録してください</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {businessGroups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={selectedBusinessGroups.includes(group.name)}
                          onCheckedChange={() => handleBusinessGroupToggle(group.name)}
                        />
                        <Label 
                          htmlFor={`group-${group.id}`} 
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {group.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Selected business groups display */}
            {selectedBusinessGroups.length > 0 && (
              <div className="mt-2">
                <Label className="text-sm text-gray-600">選択された業務グループ:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedBusinessGroups.map((groupName) => (
                    <Badge key={groupName} variant="secondary" className="flex items-center gap-1">
                      {groupName}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeBusinessGroup(groupName)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="skillLevel">スキルレベル</Label>
            <Select value={selectedSkillLevel} onValueChange={setSelectedSkillLevel}>
              <SelectTrigger>
                <SelectValue placeholder="スキルレベルを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {skillLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || selectedBusinessGroups.length === 0}
            >
              {isLoading ? '登録中...' : `登録 (${selectedBusinessGroups.length}件)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};