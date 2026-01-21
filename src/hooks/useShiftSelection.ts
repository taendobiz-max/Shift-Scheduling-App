import { useState, useCallback } from 'react';
import { CellPosition, SwapOperation } from '../types/shift';

export const useShiftSelection = () => {
  const [firstCell, setFirstCell] = useState<CellPosition | null>(null);
  const [secondCell, setSecondCell] = useState<CellPosition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // セルを選択
  const selectCell = useCallback((cell: CellPosition) => {
    console.log('🔵 [DEBUG] selectCell called:', cell);
    console.log('🔵 [DEBUG] Current firstCell:', firstCell);
    if (!firstCell) {
      // 1つ目のセルを選択
      console.log('🔵 [DEBUG] Setting firstCell:', cell);
      setFirstCell(cell);
    } else if (
      firstCell.employeeId === cell.employeeId &&
      firstCell.businessId === cell.businessId &&
      firstCell.date === cell.date
    ) {
      // 同じセルをクリックした場合は選択解除
      console.log('🔵 [DEBUG] Same cell clicked, clearing selection');
      setFirstCell(null);
    } else {
      // 2つ目のセルを選択
      // 空セルへの移動も許可する
      console.log('🔵 [DEBUG] Setting secondCell and opening dialog:', cell);
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
    const isSelected = (
      firstCell.employeeId === cell.employeeId &&
      firstCell.businessId === cell.businessId &&
      firstCell.date === cell.date
    );
    if (isSelected) {
      console.log('🟢 [DEBUG] Cell is selected:', cell);
    }
    return isSelected;
  }, [firstCell]);

  // スワップ操作を取得
  const getSwapOperation = useCallback((): SwapOperation | null => {
    if (!firstCell || !secondCell) return null;
    console.log("🔍 [DEBUG] getSwapOperation - firstCell, secondCell:", firstCell, secondCell);
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
