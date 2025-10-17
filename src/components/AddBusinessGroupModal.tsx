import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { addBusinessGroup } from '@/utils/businessGroupManager';
import { toast } from 'sonner';

interface AddBusinessGroupModalProps {
  onGroupAdded: () => void;
}

export const AddBusinessGroupModal: React.FC<AddBusinessGroupModalProps> = ({ onGroupAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      toast.error('業務グループ名を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      await addBusinessGroup(groupName, description);
      toast.success(`業務グループ「${groupName}」を追加しました`);
      
      // Reset form and close modal
      setGroupName('');
      setDescription('');
      setIsOpen(false);
      
      // Notify parent to refresh data
      onGroupAdded();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '業務グループの追加に失敗しました';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Plus className="h-4 w-4 mr-1" />
          新規追加
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新しい業務グループを追加</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">業務グループ名 *</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="例: 新規路線"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="業務グループの説明を入力してください"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '追加中...' : '追加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};