import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { SwapOperation } from '../../types/shift';

interface SwapConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swapOperation: SwapOperation | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const SwapConfirmDialog: React.FC<SwapConfirmDialogProps> = ({
  open,
  onOpenChange,
  swapOperation,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!swapOperation) return null;

  const { from, to } = swapOperation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>シフトの入れ替え確認</DialogTitle>
          <DialogDescription>
            以下のシフトを入れ替えますか？
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 bg-blue-50">
            <p className="font-semibold text-sm text-gray-600 mb-2">入れ替え元</p>
            <p className="text-sm">
              従業員ID: {from.employeeId}<br />
              業務ID: {from.businessId}<br />
              日付: {from.date}
            </p>
          </div>
          
          <div className="flex justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          
          <div className="border rounded-lg p-4 bg-green-50">
            <p className="font-semibold text-sm text-gray-600 mb-2">入れ替え先</p>
            <p className="text-sm">
              従業員ID: {to.employeeId}<br />
              業務ID: {to.businessId}<br />
              日付: {to.date}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : '入れ替える'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
