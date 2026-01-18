/**
 * EmptyCell Component
 * 
 * ShiftBarコンポーネントと同じパターンを使用した空セルコンポーネント。
 * シフトが割り当てられていない時間帯をクリック可能にする。
 */

interface EmptyCellProps {
  employeeId: string;
  employeeName: string;
  date: string;
  startHour: number;
  endHour: number;
  isSelected: boolean;
  onClick: () => void;
}

export const EmptyCell = ({
  employeeId,
  employeeName,
  date,
  startHour,
  endHour,
  isSelected,
  onClick
}: EmptyCellProps) => {
  const handleClick = () => {
    console.log('🟢 [EmptyCell] Clicked:', { employeeId, employeeName, date, startHour, endHour });
    onClick();
  };
  // 時間帯の計算（4:00を0%、翌日3:59を100%とする）
  const calculatePosition = (hour: number) => {
    // 4:00を基準とした時間（0-23）
    const adjustedHour = (hour - 4 + 24) % 24;
    return (adjustedHour / 24) * 100;
  };

  const left = calculatePosition(startHour);
  const width = calculatePosition(endHour) - left;

  return (
    <div
      style={{ 
        left: `${left}%`, 
        width: `${width}%` 
      }}
      onClick={handleClick}
      className={`absolute top-2 bottom-2 rounded border-2 border-dashed flex items-center justify-center text-xs font-medium transition-all z-10 cursor-pointer ${
        isSelected 
          ? 'bg-orange-100 border-orange-400 hover:bg-orange-200' 
          : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
      }`}
      title={`${employeeName}の空き時間帯（${startHour}:00 - ${endHour}:00）をクリックしてシフトを移動`}
    >
      {isSelected && (
        <span className="text-orange-600 font-semibold">選択中</span>
      )}
    </div>
  );
};
