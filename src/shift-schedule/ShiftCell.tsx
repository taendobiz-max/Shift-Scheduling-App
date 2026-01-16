import React from 'react';
import { CellPosition } from '../../types/shift';

interface ShiftCellProps {
  position: CellPosition;
  content: React.ReactNode;
  isSelected: boolean;
  onClick: (position: CellPosition) => void;
  className?: string;
}

export const ShiftCell: React.FC<ShiftCellProps> = ({
  position,
  content,
  isSelected,
  onClick,
  className = '',
}) => {
  return (
    <td
      className={`
        border border-gray-300 p-2 cursor-pointer transition-colors
        hover:bg-blue-50
        ${isSelected ? 'bg-blue-200 ring-2 ring-blue-500' : 'bg-white'}
        ${className}
      `}
      onClick={() => onClick(position)}
    >
      {content}
    </td>
  );
};
