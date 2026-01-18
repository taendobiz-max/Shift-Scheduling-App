/**
 * 空き時間帯を計算するヘルパー関数
 * 
 * 従業員のシフトから、シフトが割り当てられていない時間帯を計算します。
 * 4:00から翌日3:59までの24時間を対象とします。
 */

interface Shift {
  start_time?: string;
  end_time?: string;
}

interface EmptyTimeSlot {
  startHour: number;
  endHour: number;
}

/**
 * 時刻文字列（HH:MM:SS）から時間（0-23）を取得
 */
const parseHour = (timeString: string): number => {
  const hour = parseInt(timeString.split(':')[0], 10);
  return hour;
};

/**
 * 従業員のシフトから空き時間帯を計算
 * @param shifts 従業員のシフトリスト
 * @returns 空き時間帯のリスト
 */
export const calculateEmptyTimeSlots = (shifts: Shift[]): EmptyTimeSlot[] => {
  if (shifts.length === 0) {
    // シフトが1つもない場合は、4:00-翌日3:59の全時間帯が空き
    return [{ startHour: 4, endHour: 28 }]; // 28 = 翌日4:00
  }

  // シフトを開始時間でソート
  const sortedShifts = [...shifts]
    .filter(s => s.start_time && s.end_time)
    .map(s => ({
      startHour: parseHour(s.start_time!),
      endHour: parseHour(s.end_time!),
    }))
    .sort((a, b) => a.startHour - b.startHour);

  const emptySlots: EmptyTimeSlot[] = [];
  let currentHour = 4; // 4:00から開始

  for (const shift of sortedShifts) {
    let shiftStart = shift.startHour;
    let shiftEnd = shift.endHour;

    // 終了時間が開始時間より小さい場合は、翌日にまたがるシフト
    if (shiftEnd < shiftStart) {
      shiftEnd += 24;
    }

    // 4:00基準に調整
    if (shiftStart < 4) {
      shiftStart += 24;
    }
    if (shiftEnd < 4) {
      shiftEnd += 24;
    }

    // 現在の時刻とシフト開始時刻の間に空き時間がある場合
    if (currentHour < shiftStart) {
      emptySlots.push({
        startHour: currentHour,
        endHour: shiftStart,
      });
    }

    // 次のシフトの開始時刻を更新
    currentHour = Math.max(currentHour, shiftEnd);
  }

  // 最後のシフト終了後から翌日4:00までの空き時間
  if (currentHour < 28) { // 28 = 翌日4:00
    emptySlots.push({
      startHour: currentHour,
      endHour: 28,
    });
  }

  return emptySlots;
};
