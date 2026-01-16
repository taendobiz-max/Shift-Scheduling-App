// Mock data loader for constraints and allowances
export interface Constraint {
  id: string;
  name: string;
  description: string;
}

export interface Allowance {
  id: string;
  name: string;
  amount: string;
}

export const loadConstraints = async (): Promise<Constraint[]> => {
  // Mock constraint data
  return [
    { id: '1', name: '連続勤務制限', description: '連続勤務は3日まで' },
    { id: '2', name: '休憩時間', description: '4時間勤務ごとに30分休憩' },
    { id: '3', name: '週間労働時間', description: '週40時間以内' }
  ];
};

export const loadAllowances = async (): Promise<Allowance[]> => {
  // Mock allowance data
  return [
    { id: '1', name: '早朝手当', amount: '500円' },
    { id: '2', name: '深夜手当', amount: '800円' },
    { id: '3', name: '休日手当', amount: '1000円' }
  ];
};