import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Employee } from '@/types';

interface EmployeeFormProps {
  employee?: Employee | null;
  onSubmit: (employee: Employee | Omit<Employee, 'id'>) => void;
  onCancel: () => void;
}

const availableSkills = [
  '大型免許',
  '中型免許',
  '路線バス',
  '高速バス',
  '観光バス',
  '送迎バス',
  '夜間運行',
  '長距離運行',
];

const depots = [
  '川越営業所',
  '東京営業所',
  '埼玉営業所',
  '千葉営業所',
];

export default function EmployeeForm({ employee, onSubmit, onCancel }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    employeeNumber: employee?.employeeNumber || '',
    depot: employee?.depot || '',
    employmentType: employee?.employmentType || 'full-time' as Employee['employmentType'],
    skills: employee?.skills || [],
    maxConsecutiveDays: employee?.maxConsecutiveDays || 5,
    monthlyHourLimit: employee?.monthlyHourLimit || 180,
    specialNotes: employee?.specialNotes || '',
    isActive: employee?.isActive ?? true,
  });

  const handleSkillChange = (skill: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        skills: prev.skills.filter(s => s !== skill)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (employee) {
      onSubmit({ ...employee, ...formData });
    } else {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">氏名 *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="employeeNumber">従業員番号 *</Label>
          <Input
            id="employeeNumber"
            value={formData.employeeNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, employeeNumber: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="depot">営業所 *</Label>
          <Select value={formData.depot} onValueChange={(value) => setFormData(prev => ({ ...prev, depot: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="営業所を選択" />
            </SelectTrigger>
            <SelectContent>
              {depots.map(depot => (
                <SelectItem key={depot} value={depot}>{depot}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="employmentType">雇用形態 *</Label>
          <Select value={formData.employmentType} onValueChange={(value: Employee['employmentType']) => setFormData(prev => ({ ...prev, employmentType: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">正社員</SelectItem>
              <SelectItem value="part-time">パート</SelectItem>
              <SelectItem value="contract">契約社員</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>保有スキル</Label>
        <div className="grid grid-cols-2 gap-2">
          {availableSkills.map(skill => (
            <div key={skill} className="flex items-center space-x-2">
              <Checkbox
                id={skill}
                checked={formData.skills.includes(skill)}
                onCheckedChange={(checked) => handleSkillChange(skill, checked as boolean)}
              />
              <Label htmlFor={skill} className="text-sm">{skill}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxConsecutiveDays">連勤制限（日）</Label>
          <Input
            id="maxConsecutiveDays"
            type="number"
            min="1"
            max="10"
            value={formData.maxConsecutiveDays}
            onChange={(e) => setFormData(prev => ({ ...prev, maxConsecutiveDays: parseInt(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlyHourLimit">月間時間上限（時間）</Label>
          <Input
            id="monthlyHourLimit"
            type="number"
            min="80"
            max="200"
            value={formData.monthlyHourLimit}
            onChange={(e) => setFormData(prev => ({ ...prev, monthlyHourLimit: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="specialNotes">特記事項</Label>
        <Textarea
          id="specialNotes"
          value={formData.specialNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, specialNotes: e.target.value }))}
          placeholder="特別な制約や注意事項があれば記入してください"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
        />
        <Label htmlFor="isActive">アクティブ（勤務可能）</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit">
          {employee ? '更新' : '登録'}
        </Button>
      </div>
    </form>
  );
}