import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Award } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';

interface EmployeeSkill {
  id?: number;
  employee_id: string;
  business_group: string;
  skill_level: string;
  skill_name: string;
}

interface EmployeeSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export function EmployeeSkillModal({ isOpen, onClose, employeeId, employeeName }: EmployeeSkillModalProps) {
  const [skills, setSkills] = useState<EmployeeSkill[]>([]);
  const [businessGroups, setBusinessGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newSkill, setNewSkill] = useState<Partial<EmployeeSkill>>({
    business_group: '',
    skill_level: '',
    skill_name: ''
  });

  useEffect(() => {
    if (isOpen && employeeId) {
      loadSkills();
      loadBusinessGroups();
    }
  }, [isOpen, employeeId]);

  const loadSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skill_matrix')
        .select('*')
        .eq('employee_id', employeeId)
        .order('business_group');

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error('Error loading skills:', error);
      toast.error('スキル情報の読み込みに失敗しました');
    }
  };

  const loadBusinessGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('business_master')
        .select('業務グループ')
        .order('業務グループ');

      if (error) throw error;
      const uniqueGroups = [...new Set(data?.map(bg => bg.業務グループ).filter(Boolean))];
      setBusinessGroups(uniqueGroups);
    } catch (error) {
      console.error('Error loading business groups:', error);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.business_group || !newSkill.skill_level) {
      toast.error('業務グループとスキルレベルを入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('skill_matrix')
        .insert({
          employee_id: employeeId,
          business_group: newSkill.business_group,
          skill_level: newSkill.skill_level,
          skill_name: newSkill.skill_name || newSkill.business_group
        });

      if (error) throw error;

      toast.success('スキルを追加しました');
      setNewSkill({ business_group: '', skill_level: '', skill_name: '' });
      loadSkills();
    } catch (error) {
      console.error('Error adding skill:', error);
      toast.error('スキルの追加に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSkill = async (skillId: number) => {
    if (!confirm('このスキルを削除しますか？')) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('skill_matrix')
        .delete()
        .eq('id', skillId);

      if (error) throw error;

      toast.success('スキルを削除しました');
      loadSkills();
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast.error('スキルの削除に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getSkillLevelBadgeColor = (level: string) => {
    switch (level) {
      case '◎': return 'bg-green-500';
      case '○': return 'bg-blue-500';
      case '△': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            スキル管理 - {employeeName}
          </DialogTitle>
          <DialogDescription>
            従業員のスキル情報を管理します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium mb-3">新しいスキルを追加</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select
                value={newSkill.business_group}
                onValueChange={(value) => setNewSkill({ ...newSkill, business_group: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="業務グループ" />
                </SelectTrigger>
                <SelectContent>
                  {businessGroups.map(bg => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={newSkill.skill_level}
                onValueChange={(value) => setNewSkill({ ...newSkill, skill_level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="スキルレベル" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="○">○ (対応可)</SelectItem>
                  <SelectItem value="△">△ (要支援)</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="スキル名（任意）"
                value={newSkill.skill_name}
                onChange={(e) => setNewSkill({ ...newSkill, skill_name: e.target.value })}
              />

              <Button onClick={handleAddSkill} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-1" />
                追加
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">業務スキル一覧 (全業務)</h3>
            {businessGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>業務グループが見つかりません</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>業務グループ</TableHead>
                      <TableHead>スキルレベル</TableHead>
                      <TableHead>スキル名</TableHead>
                      <TableHead className="w-20">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businessGroups.map((group) => {
                      const skill = skills.find(s => s.business_group === group);
                      return (
                        <TableRow key={group}>
                          <TableCell className="font-medium">{group}</TableCell>
                          <TableCell>
                            {skill ? (
                              <Badge className={getSkillLevelBadgeColor(skill.skill_level)}>
                                {skill.skill_level}
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-400">対応不可</Badge>
                            )}
                          </TableCell>
                          <TableCell>{skill?.skill_name || '−'}</TableCell>
                          <TableCell>
                            {skill && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSkill(skill.id!)}
                                disabled={isLoading}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
