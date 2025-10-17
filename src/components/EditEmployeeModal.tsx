import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { EmployeeMaster, updateEmployeeInSupabase } from '@/utils/employeeExcelLoader';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeMaster | null;
  onEmployeeUpdated: () => void;
}

export function EditEmployeeModal({ isOpen, onClose, employee, onEmployeeUpdated }: EditEmployeeModalProps) {
  const [formData, setFormData] = useState<EmployeeMaster>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({ ...employee });
    } else {
      setFormData({});
    }
  }, [employee]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRollCallCapableChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roll_call_capable: checked,
      roll_call_duty: checked ? '1' : '0' // Sync with legacy field
    }));
  };

  const handleSave = async () => {
    if (!employee?.employee_id) {
      toast.error('従業員IDが見つかりません');
      return;
    }

    setIsLoading(true);
    try {
      const success = await updateEmployeeInSupabase(employee.employee_id, formData);
      if (success) {
        toast.success('従業員データを更新しました');
        onEmployeeUpdated();
        onClose();
      } else {
        toast.error('従業員データの更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('従業員データの更新中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(employee || {});
    onClose();
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>従業員情報編集</DialogTitle>
          <DialogDescription>
            従業員の情報を編集してください。
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">従業員ID</Label>
              <Input
                id="employee_id"
                value={formData.employee_id || ''}
                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                disabled // 従業員IDは変更不可
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">氏名</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="office">営業所</Label>
            <Select
              value={formData.office || ''}
              onValueChange={(value) => handleInputChange('office', value)}
            >
              <SelectTrigger>
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
          
          {/* New Roll Call Capability Checkbox */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">点呼対応可能</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="roll_call_capable"
                checked={formData.roll_call_capable || false}
                onCheckedChange={handleRollCallCapableChange}
              />
              <Label htmlFor="roll_call_capable" className="text-sm">
                この従業員は点呼業務に対応可能です
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              チェックを入れると点呼業務に対応可能な従業員として設定されます
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roll_call_duty">点呼業務（レガシー）</Label>
            <Select
              value={formData.roll_call_duty || ''}
              onValueChange={(value) => {
                handleInputChange('roll_call_duty', value);
                // Sync with new checkbox field
                setFormData(prev => ({
                  ...prev,
                  roll_call_duty: value,
                  roll_call_capable: value === '1'
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="点呼業務を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">対応可能</SelectItem>
                <SelectItem value="0">対応不可</SelectItem>
                <SelectItem value="">未設定</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}