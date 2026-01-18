/**
 * ShiftBar Component
 * 
 * シフトバーを表示するコンポーネント。
 * クリック可能で、選択状態を視覚的に表示する。
 */

interface ShiftBarProps {
  employeeId: string;
  employeeName: string;
  shiftId: string;
  businessId: string;
  businessName: string;
  date: string;
  startTime: string;
  endTime: string;
  barStyle: {
    left: string;
    width: string;
  };
  isSelected: boolean;
  onClick: () => void;
  colorScheme?: 'blue' | 'green' | 'orange' | 'purple';
}

export const ShiftBar = ({
  employeeId,
  employeeName,
  shiftId,
  businessId,
  businessName,
  date,
  startTime,
  endTime,
  barStyle,
  isSelected,
  onClick,
  colorScheme = 'blue'
}: ShiftBarProps) => {
  const handleClick = () => {
    console.log('🔵 [ShiftBar] Clicked:', { employeeId, employeeName, shiftId, businessId, businessName });
    onClick();
  };
  // 色スキームの定義
  const colorClasses = {
    blue: isSelected 
      ? 'bg-orange-500 hover:bg-orange-600 text-white' 
      : 'bg-blue-500 hover:bg-blue-600 text-white',
    green: isSelected 
      ? 'bg-orange-500 hover:bg-orange-600 text-white' 
      : 'bg-green-500 hover:bg-green-600 text-white',
    orange: isSelected 
      ? 'bg-orange-700 hover:bg-orange-800 text-white' 
      : 'bg-orange-500 hover:bg-orange-600 text-white',
    purple: isSelected 
      ? 'bg-orange-500 hover:bg-orange-600 text-white' 
      : 'bg-purple-500 hover:bg-purple-600 text-white',
  };

  return (
    <div
      style={{ 
        left: barStyle.left, 
        width: barStyle.width 
      }}
      onClick={handleClick}
      className={`absolute top-2 bottom-2 rounded px-2 flex items-center justify-between text-xs font-medium transition-all z-20 cursor-pointer ${colorClasses[colorScheme]}`}
      title={`${employeeName} - ${businessName} (${startTime} - ${endTime})`}
    >
      <span className="truncate">{employeeName}</span>
      <span className="ml-2 truncate">{businessName}</span>
      <span className="ml-2 whitespace-nowrap">{startTime?.slice(0, 5)} - {endTime?.slice(0, 5)}</span>
    </div>
  );
};
