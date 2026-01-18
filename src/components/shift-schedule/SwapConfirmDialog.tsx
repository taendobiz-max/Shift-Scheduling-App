import React from 'react';
import { CustomModal } from './CustomModal';
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
  const handleConfirm = () => {
    console.log('🟢 [SwapConfirmDialog] Confirm button clicked');
    // ダイアログを閉じてからonConfirmを呼び出す
    onOpenChange(false);
    // 少し遅延させてから呼び出す（ダイアログが閉じるのを待つ）
    setTimeout(() => {
      onConfirm();
    }, 100);
  };

  const handleCancel = () => {
    console.log('🔵 [SwapConfirmDialog] Cancel button clicked');
    onCancel();
  };

  if (!swapOperation) return null;

  const { from, to } = swapOperation;

  return (
    <CustomModal 
      isOpen={open} 
      onClose={() => onOpenChange(false)} 
      title="シフトの入れ替え確認"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          以下のシフトを入れ替えますか？
        </p>

        {/* 入れ替え元 */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">入れ替え元</h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">従業員:</span>{' '}
              {from.employeeName || from.employeeId || '未選択'}
            </p>
            <p>
              <span className="font-medium">業務:</span>{' '}
              {from.businessName || '未割り当て'}
            </p>
            <p>
              <span className="font-medium">日付:</span> {from.date || '未選択'}
            </p>
          </div>
        </div>

        {/* 矢印 */}
        <div className="flex justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </div>

        {/* 入れ替え先 */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">入れ替え先</h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">従業員:</span>{' '}
              {to.employeeName || to.employeeId || '未選択'}
            </p>
            <p>
              <span className="font-medium">業務:</span>{' '}
              {to.businessName || '未割り当て'}
            </p>
            <p>
              <span className="font-medium">日付:</span> {to.date || '未選択'}
            </p>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '処理中...' : '入れ替える'}
          </button>
        </div>
      </div>
    </CustomModal>
  );
};
