export enum UserType {
  DRIVER = 'driver',
  CONDUCTOR = 'conductor',
  MANAGER = 'manager',
  DISPATCHER = 'dispatcher'
}

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  depot: string;
  userType: UserType;
  phoneNumber?: string;
  email?: string;
  hireDate?: string;
  notes?: string;
  employeeNumber?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract';
  skills?: string[];
  maxConsecutiveDays?: number;
  monthlyHourLimit?: number;
  specialNotes?: string;
  isActive?: boolean;
  team?: string; // 班情報
}

export interface ShiftType {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  requiredStaff: number;
  allowanceEligible: boolean;
  description?: string;
}

export interface Shift {
  id: string;
  date: string;
  employeeId: string;
  shiftTypeId: string;
  status: 'assigned' | 'confirmed' | 'completed';
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string;
}

// 新しい業務マスタ関連の型定義
export interface BusinessTask {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  morningAllowance: boolean;
  nightAllowance: boolean;
  skillMapItem: string;
  pairTaskId?: string;
}

// 制約条件マスタの型定義
export interface Constraint {
  id: string;
  name: string;
  type: 'workdays' | 'rest_time' | 'monthly_hours' | 'weekly_hours';
  value: number;
  scope: string;
  isActive: boolean;
  notes?: string;
}

// 手当設定マスタの型定義
export interface Allowance {
  id: string;
  name: string;
  type: 'basic' | 'overtime' | 'special';
  amount: number;
  calculationMethod: 'fixed' | 'hourly' | 'percentage';
  targetTasks: string;
  targetDepot: string;
  notes?: string;
}

// スキルマップの型定義
export interface SkillMap {
  employeeName: string;
  skills: { [taskName: string]: boolean };
}

// 拘束時間表の型定義
export interface WorkSchedule {
  company: string;
  morningDeparture: string;
  morningReturn: string;
  eveningDeparture: string;
  eveningReturn: string;
}