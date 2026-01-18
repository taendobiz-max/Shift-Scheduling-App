import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';
import { AlertTriangle } from 'lucide-react';

interface BusinessGroup {
  id: string;
  name: string;
  description?: string;
}

interface DeleteBusinessGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessGroup: BusinessGroup | null;
}

export const DeleteBusinessGroupModal: React.FC<DeleteBusinessGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  businessGroup,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [relatedRecords, setRelatedRecords] = useState<number>(0);

  React.useEffect(() => {
    if (isOpen && businessGroup) {
      checkRelatedRecords();
    }
  }, [isOpen, businessGroup]);

  const checkRelatedRecords = async () => {
    if (!businessGroup) return;

    try {
      // Check for related skill matrix records
      const { count, error } = await supabase
        .from('skill_matrix')
        .select('*', { count: 'exact', head: true })
        .eq('business_group', businessGroup.name);

      if (error) {
        console.error('Error checking related records:', error);
        return;
      }

      setRelatedRecords(count || 0);
    } catch (error) {
      console.error('Error checking related records:', error);
    }
  };

  const handleDelete = async () => {
    if (!businessGroup) {
      toast.error('削除対象の業務グループが見つかりません。');
      return;
    }

    setIsLoading(true);

    try {
      // Delete the business group
      const { error: deleteError } = await supabase
        .from('business_groups')
        .delete()
        .eq('id', businessGroup.id);

      if (deleteError) throw deleteError;

      toast.success('業務グループを削除しました。');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting business group:', error);
      toast.error('業務グループの削除に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            業務グループの削除
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">
              以下の業務グループを削除しますか？
            </p>
            <p className="font-medium text-red-900 mt-1">
              {businessGroup?.name}
            </p>
          </div>

          {relatedRecords > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                <strong>注意:</strong> この業務グループは {relatedRecords} 件のスキルマトリクスで使用されています。
                削除すると関連するデータに影響する可能性があります。
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600">
            この操作は取り消すことができません。本当に削除しますか？
          </p>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? '削除中...' : '削除'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};