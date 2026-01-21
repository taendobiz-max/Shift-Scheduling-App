/**
 * ShiftBar Component
 * 
 * シフトバーを表示するコンポーネント。
 * クリック可能で、選択状態を視覚的に表示する。
 */
interface ShiftBarProps {
  shift: any;
  isSelected: boolean;
  onClick: () => void;
}

export const ShiftBar = ({ shift, isSelected, onClick }: ShiftBarProps) => {
  const handleClick = () => {
    console.log('🔵 [ShiftBar] Clicked:', shift);
    onClick();
  };

  // 時間を時間数に変換（HH:MM:SS形式）
  const parseHour = (timeString: string): number => {
    if (!timeString) return 0;
    const hour = parseInt(timeString.split(':')[0], 10);
    return hour;
  };

  const startHour = parseHour(shift.start_time || '00:00:00');
  const endHour = parseHour(shift.end_time || '00:00:00');

  // 4:00基準で位置を計算
  const adjustedStart = startHour < 4 ? startHour + 24 : startHour;
  const adjustedEnd = endHour < 4 ? endHour + 24 : endHour;

  const left = ((adjustedStart - 4) / 24) * 100;
  const width = ((adjustedEnd - adjustedStart) / 24) * 100;

  return (
    <div
      style={{ 
        left: `${left}%`, 
        width: `${width}%`,
        position: 'absolute',
        top: '4px',
        bottom: '4px',
        zIndex: 50
      }}
      onClick={handleClick}
      className={`rounded px-2 flex items-center justify-between text-xs font-medium transition-all cursor-pointer ${
        isSelected 
          ? 'bg-orange-500 hover:bg-orange-600 text-white' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      }`}
      title={`${shift.employee_name || ''} - ${shift.business_name || ''} (${shift.start_time?.slice(0, 5) || ''} - ${shift.end_time?.slice(0, 5) || ''})`}
    >
      <span className="truncate">{shift.employee_name || ''}</span>
      <span className="ml-2 truncate">{shift.business_name || ''}</span>
      <span className="ml-2 whitespace-nowrap">
        {shift.start_time?.slice(0, 5) || ''} - {shift.end_time?.slice(0, 5) || ''}
      </span>
    </div>
  );
};
