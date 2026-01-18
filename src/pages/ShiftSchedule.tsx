import React, { useState, useEffect, useMemo } from 'react';
import { useShiftData } from '../hooks/useShiftData';
import { ShiftBar } from '../components/shift-schedule/ShiftBar';
import { calculateEmptyTimeSlots } from '../utils/emptyTimeSlots';

const ShiftSchedule: React.FC = () => {
  const { shifts, employees, loading, error, swapShifts, refreshData } = useShiftData();
  const [selectedCell, setSelectedCell] = useState<any>(null);

  const handleCellClick = (cell: any) => {
    console.log('🟠 [DEBUG] handleCellClick called:', cell);
    if (selectedCell) {
      if (window.confirm('シフトを入れ替えますか？')) {
        swapShifts(selectedCell, cell).then(() => {
          setSelectedCell(null);
          refreshData();
        });
      } else {
        setSelectedCell(null);
      }
    } else {
      setSelectedCell(cell);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">シフト管理</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">従業員</th>
              {Array.from({ length: 24 }).map((_, i) => (
                <th key={i} className="border border-gray-300 p-2 w-12">{i}:00</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => {
              const employeeShifts = shifts.filter(s => s.employee_id === employee.id);
              const emptySlots = calculateEmptyTimeSlots(employeeShifts);
              
              return (
                <tr key={employee.id}>
                  <td className="border border-gray-300 p-2">{employee.name}</td>
                  <td colSpan={24} className="border border-gray-300 p-0 relative h-12">
                    {employeeShifts.map(shift => (
                      <ShiftBar
                        key={shift.id}
                        shift={shift}
                        isSelected={selectedCell?.id === shift.id}
                        onClick={() => handleCellClick(shift)}
                      />
                    ))}
                    {emptySlots.map((slot, idx) => (
                      <div
                        key={idx}
                        onClickCapture={(e) => { console.log("CLICKED"); e.stopPropagation(); window.alert("CLICKED"); } } onMouseDownCapture={(e) => { console.log("MOUSEDOWN"); window.alert("MOUSEDOWN"); } } onPointerDownCapture={(e) => { console.log("POINTERDOWN"); window.alert("POINTERDOWN"); } } onMouseDown={(e) => { console.log("MOUSEDOWN_NORMAL"); window.alert("MOUSEDOWN_NORMAL"); } } onClick={(e) => { console.log("CLICK_NORMAL"); window.alert("CLICK_NORMAL"); } } onPointerDown={(e) => { console.log("POINTERDOWN_NORMAL"); window.alert("POINTERDOWN_NORMAL");
                          console.log('🔴 [DEBUG] Empty cell clicked:', slot);
                          handleCellClick({ ...slot, employee_id: employee.id });
                        }}
                        style={{
                          position: 'absolute',
                          left: `${(slot.startHour - 4) * 4.16}%`,
                          width: `${(slot.endHour - slot.startHour) * 4.16}%`,
                          top: '4px',
                          bottom: '4px',
                          border: '2px dashed red',
                          backgroundColor: 'rgba(255, 0, 0, 0.1)',
                          cursor: 'pointer',
                          zIndex: 20
                        }}
                        title={`${employee.name}の空き時間帯 (${slot.startHour}:00 - ${slot.endHour}:00)`}
                      />
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default ShiftSchedule;
