import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Settings } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
}

interface SkillManagerProps {
  onSkillsUpdate: (skills: Skill[]) => void;
}

const defaultSkills: Skill[] = [
  { id: '1', name: '大型免許', category: '免許', description: '大型自動車運転免許', isActive: true },
  { id: '2', name: '中型免許', category: '免許', description: '中型自動車運転免許', isActive: true },
  { id: '3', name: '路線バス', category: '業務', description: '路線バス運行業務', isActive: true },
  { id: '4', name: '高速バス', category: '業務', description: '高速バス運行業務', isActive: true },
  { id: '5', name: '観光バス', category: '業務', description: '観光バス運行業務', isActive: true },
  { id: '6', name: '送迎バス', category: '業務', description: '送迎バス運行業務', isActive: true },
  { id: '7', name: '夜間運行', category: '特殊', description: '夜間時間帯の運行業務', isActive: true },
  { id: '8', name: '長距離運行', category: '特殊', description: '長距離路線の運行業務', isActive: true },
];

export default function SkillManager({ onSkillsUpdate }: SkillManagerProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: '',
    description: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('skills');
    if (stored) {
      setSkills(JSON.parse(stored));
    } else {
      setSkills(defaultSkills);
      localStorage.setItem('skills', JSON.stringify(defaultSkills));
    }
  }, []);

  const saveSkills = (newSkills: Skill[]) => {
    setSkills(newSkills);
    localStorage.setItem('skills', JSON.stringify(newSkills));
    onSkillsUpdate(newSkills);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const skill: Skill = {
      id: Date.now().toString(),
      ...newSkill,
      isActive: true,
    };
    const updatedSkills = [...skills, skill];
    saveSkills(updatedSkills);
    setNewSkill({ name: '', category: '', description: '' });
    setIsDialogOpen(false);
  };

  const handleEditSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSkill) {
      const updatedSkills = skills.map(skill =>
        skill.id === editingSkill.id ? { ...editingSkill, ...newSkill } : skill
      );
      saveSkills(updatedSkills);
      setEditingSkill(null);
      setNewSkill({ name: '', category: '', description: '' });
      setIsDialogOpen(false);
    }
  };

  const handleDeleteSkill = (id: string) => {
    const updatedSkills = skills.filter(skill => skill.id !== id);
    saveSkills(updatedSkills);
  };

  const openEditDialog = (skill: Skill) => {
    setEditingSkill(skill);
    setNewSkill({
      name: skill.name,
      category: skill.category,
      description: skill.description || '',
    });
    setIsDialogOpen(true);
  };

  const getCategoryBadge = (category: string) => {
    const variants = {
      '免許': 'default',
      '業務': 'secondary',
      '特殊': 'outline'
    } as const;
    
    return <Badge variant={variants[category as keyof typeof variants] || 'outline'}>{category}</Badge>;
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                スキル管理
              </CardTitle>
              <CardDescription>
                従業員のスキル・資格・業務対応能力を管理します
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingSkill(null);
                  setNewSkill({ name: '', category: '', description: '' });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  スキル追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSkill ? 'スキル編集' : '新規スキル登録'}
                  </DialogTitle>
                  <DialogDescription>
                    スキルの詳細情報を入力してください
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={editingSkill ? handleEditSkill : handleAddSkill} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="skillName">スキル名 *</Label>
                    <Input
                      id="skillName"
                      value={newSkill.name}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリ *</Label>
                    <Input
                      id="category"
                      value={newSkill.category}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="例: 免許、業務、特殊"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">説明</Label>
                    <Input
                      id="description"
                      value={newSkill.description}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="スキルの詳細説明"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button type="submit">
                      {editingSkill ? '更新' : '登録'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedSkills).map(([category, categorySkills]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {getCategoryBadge(category)}
                  <span>{category}</span>
                  <span className="text-sm text-gray-500">({categorySkills.length}件)</span>
                </h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>スキル名</TableHead>
                        <TableHead>説明</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorySkills.map((skill) => (
                        <TableRow key={skill.id}>
                          <TableCell className="font-medium">{skill.name}</TableCell>
                          <TableCell>{skill.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={skill.isActive ? 'default' : 'secondary'}>
                              {skill.isActive ? 'アクティブ' : '無効'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(skill)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteSkill(skill.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}