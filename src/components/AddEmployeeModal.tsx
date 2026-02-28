import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';
import { OFFICES, TOKYO_TEAMS, SHIFT_DEFAULTS } from '@/constants';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeAdded: () => void;
}

export function AddEmployeeModal({ isOpen, onClose, onEmployeeAdded }: AddEmployeeModalProps) {
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    office: '',
    team: '',
    display_order: SHIFT_DEFAULTS.DISPLAY_ORDER_MAX
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.employee_id || !formData.name) {
      toast.error('従業員IDと氏名は必須です');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .insert([formData]);

      if (error) {
        console.error('Error adding employee:', error);
        toast.error('従業員の追加に失敗しました');
      } else {
        toast.success('従業員を追加しました');
        onEmployeeAdded();
        handleCancel();
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('従業員の追加中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      employee_id: '',
      name: '',
      office: '',
      team: '',
      display_order: SHIFT_DEFAULTS.DISPLAY_ORDER_MAX
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新規従業員追加</DialogTitle>
          <DialogDescription>
            新しい従業員の情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">従業員ID *</Label>
              <Input
                id="employee_id"
                value={formData.employee_id}
                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                placeholder="例: 00000095"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">氏名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="例: 田中太郎"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="office">営業所</Label>
              <Select
                value={formData.office}
                onValueChange={(value) => {
                  handleInputChange('office', value);
                  // 営業所が東京以外の場合は班をクリア
                  if (value !== '東京') {
                    handleInputChange('team', '');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="営業所を選択" />
                </SelectTrigger>
                <SelectContent>
                  {[...OFFICES, 'その他'].map((office) => (
                    <SelectItem key={office} value={office}>{office}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">班（東京のみ）</Label>
              <Select
                value={formData.team}
                onValueChange={(value) => handleInputChange('team', value)}
                disabled={formData.office !== '東京'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    formData.office === '東京' 
                      ? "班を選択" 
                      : "東京営業所のみ"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {TOKYO_TEAMS.map((team) => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="display_order">表示順</Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order}
              onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 9999)}
              placeholder="9999"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? '追加中...' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}