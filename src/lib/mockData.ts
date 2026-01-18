import { Employee, Shift, ShiftType, LeaveRequest } from '@/types';

// 実際の乗務員マスタデータを基にした従業員データ
export const mockEmployees: Employee[] = [
  {
    id: '00000001',
    name: '今井淳一',
    employeeNumber: '00000001',
    depot: '川越',
    employmentType: 'full-time',
    skills: ['大型免許', '路線バス'],
    maxConsecutiveDays: 5,
    monthlyHourLimit: 180,
    specialNotes: '',
    isActive: true,
    userType: 0 // 参照ユーザ
  },
  {
    id: '00000003',
    name: '西岡竜太',
    employeeNumber: '00000003',
    depot: '高速バス',
    employmentType: 'full-time',
    skills: ['大型免許', '高速バス'],
    maxConsecutiveDays: 5,
    monthlyHourLimit: 180,
    specialNotes: '',
    isActive: true,
    userType: 1 // 管理者（シフト作成者）
  },
  {
    id: '00000009',
    name: '小林淳一',
    employeeNumber: '00000009',
    depot: '高速バス',
    employmentType: 'full-time',
    skills: ['大型免許', '高速バス'],
    maxConsecutiveDays: 5,
    monthlyHourLimit: 180,
    specialNotes: '',
    isActive: true,
    userType: 0 // 参照ユーザ
  },
  {
    id: '00000039',
    name: '福島満好',
    employeeNumber: '00000039',
    depot: '川越',
    employmentType: 'full-time',
    skills: ['大型免許', '路線バス'],
    maxConsecutiveDays: 5,
    monthlyHourLimit: 180,
    specialNotes: '',
    isActive: true,
    userType: 0 // 参照ユーザ
  },
  {
    id: '00000051',
    name: '吉田富雄',
    employeeNumber: '00000051',
    depot: '川越',
    employmentType: 'full-time',
    skills: ['大型免許', '路線バス'],
    maxConsecutiveDays: 5,
    monthlyHourLimit: 180,
    specialNotes: '',
    isActive: true,
    userType: 0 // 参照ユーザ
  },
  {
    id: '00000052',
    name: '大塚弘',
    employeeNumber: '00000052',
    depot: '川越',
    employmentType: 'full-time',
    skills: ['大型免許', '路線バス'],
    maxConsecutiveDays: 5,
    monthlyHourLimit: 180,
    specialNotes: '',
    isActive: true,
    userType: 0 // 参照ユーザ
  },
  {
    id: '00000053',
    name: '小野寺俊雄',
    employeeNumber: '00000053',
    depot: '川越',
    employmentType: 'full-time',
    skills: ['大型免許', '路線バス'],
    maxConsecutiveDays: 5,
    monthlyHourLimit: 180,
    specialNotes: '',
    isActive: true,
    userType: 0 // 参照ユーザ
  },
  {
    id: '00000054',
    name: '田中健次',
    employeeNumber: '00000054',
    depot: '川越',
    employmentType: 'full-time',
    skills: ['大型免許', '路線バス'],
    maxConsecutiveDays: 5,
    monthlyHourLimit: 180,
    specialNotes: '',
    isActive: true,
    userType: 0 // 参照ユーザ
  },
  {
    id: '00000055',
    name: '山田太郎',
    employeeNumber: '00000055',
    depot: '川越',
    employmentType: 'full-time',
    skills: ['大型免許', '路線バス', '観光バス'],
    maxConsecutiveDays: 5,
    monthlyHourLimit: 180,
    specialNotes: '',
    isActive: true,
    userType: 0 // 参照ユーザ
  },
  {
    id: '00000056',
    name: '佐藤花子',
    employeeNumber: '00000056',
    depot: '高速バス',
    employmentType: 'part-time',
    skills: ['大型免許', '高速バス'],
    maxConsecutiveDays: 3,
    monthlyHourLimit: 120,
    specialNotes: '',
    isActive: true,
    userType: 0 // 参照ユーザ
  }
];

export const mockShiftTypes: ShiftType[] = [
  {
    id: 'early',
    name: '早番',
    startTime: '05:00',
    endTime: '13:00',
    requiredStaff: 3,
    allowanceEligible: true,
    description: '朝の通勤ラッシュ対応'
  },
  {
    id: 'day',
    name: '日勤',
    startTime: '08:00',
    endTime: '17:00',
    requiredStaff: 5,
    allowanceEligible: false,
    description: '日中の定期運行'
  },
  {
    id: 'late',
    name: '遅番',
    startTime: '13:00',
    endTime: '22:00',
    requiredStaff: 4,
    allowanceEligible: true,
    description: '夕方の帰宅ラッシュ対応'
  },
  {
    id: 'night',
    name: '夜勤',
    startTime: '22:00',
    endTime: '06:00',
    requiredStaff: 2,
    allowanceEligible: true,
    description: '深夜・早朝運行'
  }
];

export const mockShifts: Shift[] = [
  {
    id: '1',
    date: '2025-01-15',
    employeeId: '00000001',
    shiftTypeId: 'early',
    status: 'assigned'
  },
  {
    id: '2',
    date: '2025-01-15',
    employeeId: '00000003',
    shiftTypeId: 'day',
    status: 'confirmed'
  },
  {
    id: '3',
    date: '2025-01-15',
    employeeId: '00000009',
    shiftTypeId: 'late',
    status: 'assigned'
  },
  {
    id: '4',
    date: '2025-01-16',
    employeeId: '00000039',
    shiftTypeId: 'early',
    status: 'assigned'
  },
  {
    id: '5',
    date: '2025-01-16',
    employeeId: '00000051',
    shiftTypeId: 'day',
    status: 'assigned'
  }
];

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: '1',
    employeeId: '00000001',
    startDate: '2025-01-20',
    endDate: '2025-01-22',
    reason: '有給休暇',
    status: 'pending',
    submittedAt: '2025-01-10T09:00:00Z',
    notes: '家族旅行のため'
  },
  {
    id: '2',
    employeeId: '00000003',
    startDate: '2025-01-25',
    endDate: '2025-01-25',
    reason: '病気休暇',
    status: 'approved',
    submittedAt: '2025-01-08T14:30:00Z',
    approvedAt: '2025-01-09T10:15:00Z',
    notes: '体調不良のため'
  }
];