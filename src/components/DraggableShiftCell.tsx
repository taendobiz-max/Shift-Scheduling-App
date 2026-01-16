import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface DraggableShiftCellProps {
  employeeName: string;
  employeeId: string;
  businessMaster: string;
  date: string;
  isEmpty: boolean;
  onDrop: (sourceData: any, targetData: any) => void;
  className?: string;
}

export const DraggableShiftCell: React.FC<DraggableShiftCellProps> = ({
  employeeName,
  employeeId,
  businessMaster,
  date,
  isEmpty,
  onDrop,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (isEmpty) return;
    
    setIsDragging(true);
    const dragData = {
      employeeName,
      employeeId,
      businessMaster,
      date,
      isEmpty
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback during drag
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set dragOver to false if we're actually leaving the element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const sourceData = JSON.parse(e.dataTransfer.getData('application/json'));
      const targetData = {
        employeeName,
        employeeId,
        businessMaster,
        date,
        isEmpty
      };
      
      // Don't allow dropping on the same cell
      if (sourceData.date === targetData.date && 
          sourceData.businessMaster === targetData.businessMaster) {
        return;
      }
      
      onDrop(sourceData, targetData);
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const cellContent = isEmpty ? '-' : employeeName;
  const isDraggable = !isEmpty;

  return (
    <span
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'block px-2 py-1 rounded text-sm transition-all duration-200',
        {
          // Default styles for assigned employees
          'bg-blue-100 text-blue-800 cursor-move hover:bg-blue-200': !isEmpty,
          // Default styles for empty cells
          'text-gray-400 cursor-default': isEmpty,
          // Drag over state
          'bg-green-100 border-2 border-green-400 border-dashed': isDragOver,
          // Dragging state
          'opacity-50 scale-95': isDragging,
          // Make empty cells droppable
          'hover:bg-gray-100 border border-dashed border-gray-300': isEmpty && !isDragOver,
        },
        className
      )}
      title={
        isEmpty 
          ? 'ドロップして従業員を配置' 
          : `${employeeName} - クリック&ドラッグで移動`
      }
    >
      {cellContent}
    </span>
  );
};