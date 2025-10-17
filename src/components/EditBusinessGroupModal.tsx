import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';

interface BusinessGroup {
  id: string;
  name: string;
  description?: string;
}

interface EditBusinessGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessGroup: BusinessGroup | null;
}

export const EditBusinessGroupModal: React.FC<EditBusinessGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  businessGroup,
}) => {
  const [name, setName] = useState(businessGroup?.name || '');
  const [description, setDescription] = useState(businessGroup?.description || '');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (businessGroup) {
      setName(businessGroup.name);
      setDescription(businessGroup.description || '');
    }
  }, [businessGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('業務グループ名を入力してください。');
      return;
    }

    if (!businessGroup) {
      toast.error('編集対象の業務グループが見つかりません。');
      return;
    }

    setIsLoading(true);

    try {
      // Check for duplicate names (excluding current record)
      const { data: existing, error: checkError } = await supabase
        .from('app_9213e72257_business_groups')
        .select('id')
        .eq('name', name.trim())
        .neq('id', businessGroup.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        toast.error('同じ名前の業務グループが既に存在します。');
        return;
      }

      // Update business group
      const { error: updateError } = await supabase
        .from('app_9213e72257_business_groups')
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq('id', businessGroup.id);

      if (updateError) throw updateError;

      toast.success('業務グループを更新しました。');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating business group:', error);
      toast.error('業務グループの更新に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName(businessGroup?.name || '');
    setDescription(businessGroup?.description || '');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>業務グループの編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">業務グループ名 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="業務グループ名を入力"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="業務グループの説明（任意）"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '更新中...' : '更新'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};