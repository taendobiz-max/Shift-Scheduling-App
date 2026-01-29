/**
 * シフト削除モーダルコンポーネント
 * 
 * 営業所と期間を指定してシフトを一括削除する機能
 */

import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DeleteShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: string[];
  currentLocation?: string;
}

const DeleteShiftsModal: React.FC<DeleteShiftsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  locations,
  currentLocation
}) => {
  const [selectedLocation, setSelectedLocation] = useState(currentLocation || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [shiftCount, setShiftCount] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // 現在の日付をデフォルトにセット
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
  }, []);

  // 営業所のデフォルト値を設定
  useEffect(() => {
    if (currentLocation) {
      setSelectedLocation(currentLocation);
    }
  }, [currentLocation]);

  // モーダルが閉じられたときにリセット
  useEffect(() => {
    if (!isOpen) {
      setShowConfirmation(false);
      setShiftCount(null);
    }
  }, [isOpen]);

  // 削除対象のシフト件数を確認
  const checkShiftCount = async () => {
    if (!selectedLocation || !fromDate || !toDate) {
      toast.error('営業所と期間を選択してください');
      return;
    }

    if (fromDate > toDate) {
      toast.error('開始日は終了日より前の日付を選択してください');
      return;
    }

    setIsChecking(true);
    try {
      const { count, error } = await supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('location', selectedLocation)
        .gte('date', fromDate)
        .lte('date', toDate);

      if (error) throw error;

      setShiftCount(count || 0);
      setShowConfirmation(true);
    } catch (error) {
      console.error('シフト件数確認エラー:', error);
      toast.error('シフト件数の確認に失敗しました');
    } finally {
      setIsChecking(false);
    }
  };

  // シフトを削除
  const handleDelete = async () => {
    if (!selectedLocation || !fromDate || !toDate || shiftCount === null) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('location', selectedLocation)
        .gte('date', fromDate)
        .lte('date', toDate);

      if (error) throw error;

      toast.success(`${shiftCount}件のシフトを削除しました`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('シフト削除エラー:', error);
      toast.error('シフトの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">シフト削除</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isDeleting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-4">
          {!showConfirmation ? (
            <>
              {/* 営業所選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  営業所 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isChecking}
                >
                  <option value="">選択してください</option>
                  {locations.filter(location => location !== '本社').map(location => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              {/* 期間選択 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開始日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isChecking}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    終了日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isChecking}
                  />
                </div>
              </div>

              {/* 警告メッセージ */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">注意事項</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>削除されたシフトは復元できません</li>
                      <li>削除して問題が無いかよく確認してください</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 確認メッセージ */}
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-bold text-lg mb-2">
                      {shiftCount}件のシフトが削除されますが実行しますか？
                    </p>
                    <div className="space-y-1 text-gray-700">
                      <p>営業所: <span className="font-medium">{selectedLocation}</span></p>
                      <p>期間: <span className="font-medium">{fromDate} ～ {toDate}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          {!showConfirmation ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isChecking}
              >
                キャンセル
              </button>
              <button
                onClick={checkShiftCount}
                className="px-4 py-2 bg-white text-red-600 border-2 border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isChecking || !selectedLocation || !fromDate || !toDate}
              >
                {isChecking ? '確認中...' : '削除'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isDeleting}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? '削除中...' : 'OK（削除実行）'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteShiftsModal;
