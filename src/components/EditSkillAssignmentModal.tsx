import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, User } from 'lucide-react';
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

interface ExistingSkill {
  id: string;
  business_group: string;
  skill_level: string;
}

interface EditSkillAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: Employee | null;
}

const skillLevels = [
  { value: '対応可能', label: '対応可能' },
  { value: '経験あり', label: '経験あり' },
  { value: '研修中', label: '研修中' },
];

export const EditSkillAssignmentModal: React.FC<EditSkillAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employee,
}) => {
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [existingSkills, setExistingSkills] = useState<ExistingSkill[]>([]);
  const [selectedBusinessGroups, setSelectedBusinessGroups] = useState<string[]>([]);
  const [skillLevelMap, setSkillLevelMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen && employee) {
      loadBusinessGroups();
      loadExistingSkills();
    }
  }, [isOpen, employee]);

  const loadBusinessGroups = async () => {
    setIsLoadingData(true);
    try {
      console.log('🔄 Loading business groups for skill editing...');
      
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
          }
        }
      }

      // Sort all business groups
      allBusinessGroups.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log('📊 Total business groups available:', allBusinessGroups.length);
      setBusinessGroups(allBusinessGroups);
      
    } catch (error) {
      console.error('Error loading business groups:', error);
      toast.error('業務グループデータの読み込みに失敗しました。');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadExistingSkills = async () => {
    if (!employee) return;

    try {
      console.log('🔄 Loading existing skills for employee:', employee.name);
      
      const { data, error } = await supabase
        .from('app_9213e72257_skill_matrix')
        .select('id, business_group, skill_level')
        .eq('employee_id', employee.employee_id);

      if (error) {
        console.error('❌ Error loading existing skills:', error);
        throw error;
      }

      console.log('✅ Loaded existing skills:', data?.length || 0);
      setExistingSkills(data || []);
      
      // Set initial selected business groups and skill levels
      const selectedGroups = data?.map(skill => skill.business_group) || [];
      const levelMap: Record<string, string> = {};
      data?.forEach(skill => {
        levelMap[skill.business_group] = skill.skill_level;
      });
      
      setSelectedBusinessGroups(selectedGroups);
      setSkillLevelMap(levelMap);
      
    } catch (error) {
      console.error('Error loading existing skills:', error);
      toast.error('既存スキルデータの読み込みに失敗しました。');
    }
  };

  const handleBusinessGroupToggle = (groupName: string) => {
    setSelectedBusinessGroups(prev => {
      if (prev.includes(groupName)) {
        // Remove from selection and clear skill level
        const newSkillLevelMap = { ...skillLevelMap };
        delete newSkillLevelMap[groupName];
        setSkillLevelMap(newSkillLevelMap);
        return prev.filter(name => name !== groupName);
      } else {
        // Add to selection with default skill level
        setSkillLevelMap(prev => ({ ...prev, [groupName]: '対応可能' }));
        return [...prev, groupName];
      }
    });
  };

  const handleSkillLevelChange = (groupName: string, skillLevel: string) => {
    setSkillLevelMap(prev => ({ ...prev, [groupName]: skillLevel }));
  };

  const removeBusinessGroup = (groupName: string) => {
    setSelectedBusinessGroups(prev => prev.filter(name => name !== groupName));
    const newSkillLevelMap = { ...skillLevelMap };
    delete newSkillLevelMap[groupName];
    setSkillLevelMap(newSkillLevelMap);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee) {
      toast.error('従業員情報が見つかりません。');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Updating skill assignments...', {
        employee: employee.name,
        businessGroups: selectedBusinessGroups,
        skillLevels: skillLevelMap
      });

      // Delete all existing skill assignments for this employee
      const { error: deleteError } = await supabase
        .from('app_9213e72257_skill_matrix')
        .delete()
        .eq('employee_id', employee.employee_id);

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        throw deleteError;
      }

      // Insert new skill assignments
      if (selectedBusinessGroups.length > 0) {
        const insertData = selectedBusinessGroups.map(businessGroup => ({
          employee_id: employee.employee_id,
          skill_name: businessGroup,
          business_group: businessGroup,
          skill_level: skillLevelMap[businessGroup] || '対応可能',
        }));

        console.log('📝 Inserting updated data:', insertData);

        const { error: insertError } = await supabase
          .from('app_9213e72257_skill_matrix')
          .insert(insertData);

        if (insertError) {
          console.error('❌ Insert error:', insertError);
          throw insertError;
        }
      }

      console.log('✅ Successfully updated skill assignments');
      toast.success(`${employee.name}の担当可能業務を更新しました（${selectedBusinessGroups.length}件）。`);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating skill assignments:', error);
      toast.error('担当可能業務の更新に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setSelectedBusinessGroups([]);
    setSkillLevelMap({});
    setExistingSkills([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            担当可能業務の編集
          </DialogTitle>
        </DialogHeader>
        
        {employee && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">編集対象従業員:</span>
              <span className="font-bold text-blue-900">{employee.name}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="border rounded-md p-3 max-h-64 overflow-y-auto">
                {businessGroups.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">業務グループが見つかりません</p>
                    <p className="text-xs text-gray-400">マスタデータ管理で業務グループを登録してください</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {businessGroups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-2 flex-1">
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
                        {selectedBusinessGroups.includes(group.name) && (
                          <div className="ml-4">
                            <Select
                              value={skillLevelMap[group.name] || '対応可能'}
                              onValueChange={(value) => handleSkillLevelChange(group.name, value)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
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
                        )}
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
                      {groupName} ({skillLevelMap[groupName] || '対応可能'})
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? '更新中...' : `更新 (${selectedBusinessGroups.length}件)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};