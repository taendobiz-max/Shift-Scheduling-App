import { useState, useCallback } from 'react';
import { CellPosition, SwapOperation } from '../types/shift';

export const useShiftSelection = () => {
  const [firstCell, setFirstCell] = useState<CellPosition | null>(null);
  const [secondCell, setSecondCell] = useState<CellPosition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // セルを選択
  const selectCell = useCallback((cell: CellPosition) => {
    if (!firstCell) {
      // 1つ目のセルを選択
      setFirstCell(cell);
    } else if (
      firstCell.employeeId === cell.employeeId &&
      firstCell.businessId === cell.businessId &&
      firstCell.date === cell.date
    ) {
      // 同じセルをクリックした場合は選択解除
      setFirstCell(null);
    } else {
      // 2つ目のセルを選択して確認ダイアログを表示
      setSecondCell(cell);
      setIsDialogOpen(true);
    }
  }, [firstCell]);

  // 選択をクリア
  const clearSelection = useCallback(() => {
    setFirstCell(null);
    setSecondCell(null);
    setIsDialogOpen(false);
  }, []);

  // セルが選択されているかチェック
  const isCellSelected = useCallback((cell: CellPosition): boolean => {
    if (!firstCell) return false;
    return (
      firstCell.employeeId === cell.employeeId &&
      firstCell.businessId === cell.businessId &&
      firstCell.date === cell.date
    );
  }, [firstCell]);

  // スワップ操作を取得
  const getSwapOperation = useCallback((): SwapOperation | null => {
    if (!firstCell || !secondCell) return null;
    return {
      from: firstCell,
      to: secondCell,
    };
  }, [firstCell, secondCell]);

  return {
    firstCell,
    secondCell,
    isDialogOpen,
    selectCell,
    clearSelection,
    isCellSelected,
    getSwapOperation,
    setIsDialogOpen,
  };
};
